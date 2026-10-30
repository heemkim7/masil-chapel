import json,urllib.request as U
B='https://gisykxqhticmdhmupnry.supabase.co';K=open('/tmp/pk').read().strip()
def r(m,p,tok=None,body=None,h={}):
    hd={'apikey':K,'Content-Type':'application/json','Authorization':'Bearer '+(tok or K)};hd.update(h)
    q=U.Request(B+p,data=None if body is None else json.dumps(body).encode(),method=m,headers=hd)
    try:
        x=U.urlopen(q);return x.status,x.read().decode()
    except U.HTTPError as e: return e.code,e.read().decode()[:160]
def anon():
    s,b=r('POST','/auth/v1/signup',body={});d=json.loads(b) if s==200 else {};return d.get('access_token'),d.get('user',{}).get('id'),s
A,ua,_=anon();Bt,ub,_=anon();print(str(('ids',ua,ub,ua!=ub))[:200])
import secrets;sa=secrets.token_hex(16)
print(str(('A ins own link',r('POST','/rest/v1/account_links',A,{'user_id':ua,'secret':sa},{'Prefer':'return=minimal'})))[:200])
print(str(('B ins link for A',r('POST','/rest/v1/account_links',Bt,{'user_id':ua,'secret':'x'*20})))[:200])
print(str(('B read links',r('GET','/rest/v1/account_links?select=*',Bt)))[:200])
print(str(('B upd A link',r('PATCH','/rest/v1/account_links?user_id=eq.'+ua,Bt,{'secret':'y'*20},{'Prefer':'return=representation'})))[:200])
print(str(('A read own',r('GET','/rest/v1/account_links?select=user_id',A)))[:200])
print(str(('anon read links',r('GET','/rest/v1/account_links?select=*')))[:200])
for t in ['wallets','manna_wallets','orders','payment_transactions','grants','refunds','gacha_logs','wallet_ledger','inventory','products','offerings','journeys','eula_accepts','blocks','bible_marks','earn_rules','placement_reports','prayer_amens']:
    print(str((t,'sel',r('GET','/rest/v1/%s?select=*&limit=1'%t,A)[0],'ins',r('POST','/rest/v1/'+t,A,{})[0]))[:200])
print(str(('upd churches',r('PATCH','/rest/v1/churches?dong=eq.0000000000',A,{'total':999999},{'Prefer':'return=representation'})))[:200])
print(str(('del prayers',r('DELETE','/rest/v1/prayers?id=gt.0',A,h={'Prefer':'return=representation'})))[:200])
print(str(('chat ins',r('POST','/rest/v1/chat_messages',A,{'room':'qa_rls','name':'qa','body':'rls test','client_id':'qa'},{'Prefer':'return=minimal'})))[:200])
print(str(('chat del',r('DELETE','/rest/v1/chat_messages?room=eq.qa_rls',A,h={'Prefer':'return=representation'})))[:200])
for f in ['grant_order','refund_order','_wallet_add','_gacha','h64','reports_rate']:
    print(str(('rpc',f,r('POST','/rest/v1/rpc/'+f,A,{})[0]))[:200])
print(str(('wallet own',r('POST','/rest/v1/rpc/wallet_get',A,{'p_secret':sa})))[:200])
print(str(('spend neg',r('POST','/rest/v1/rpc/spend',A,{'p_secret':sa,'p_amount':-500,'p_item':'x'})))[:200])
print(str(('leaderboard anon',r('POST','/rest/v1/rpc/leaderboard',None,{'p_scope':'all','p_dong':'','p_period':'all'})[0]))[:200])
# linking: identity link should keep uid
s,b=r('GET','/auth/v1/user/identities/authorize?provider=google&skip_http_redirect=true&redirect_to=https://maeul-chapel-25d.vercel.app',A)
print(str(('link google',s,b))[:200])
print(str(('A still',r('GET','/auth/v1/user',A)[1][:120]))[:200])
