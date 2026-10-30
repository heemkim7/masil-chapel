import numpy as np,cv2,sys
from PIL import Image
A='/cursor/stores/store-50474523-671f-4a19-bce3-c2b79aef18aa/grok-bot/agents/361d411c-e0ea-431c-9333-a304956d23d8/assets/'
def cut(src,names,up=2,minarea=4000):
    im=cv2.imread(A+src); h,w=im.shape[:2]
    im=cv2.resize(im,(w*up,h*up),interpolation=cv2.INTER_LANCZOS4)
    g=im.astype(int); white=((g.min(2)>232)&((g.max(2)-g.min(2))<18)).astype(np.uint8)
    ff=white.copy(); m=np.zeros((ff.shape[0]+2,ff.shape[1]+2),np.uint8)
    bg=np.zeros_like(white)
    # background = white connected to border
    n,lab=cv2.connectedComponents(white)
    border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))
    bg=np.isin(lab,list(border))&(white>0)
    fg=(~bg).astype(np.uint8)
    fg=cv2.morphologyEx(fg,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(cv2.dilate(fg,np.ones((15,15),np.uint8)))
    comps=[(st[i],i) for i in range(1,n) if st[i][4]>minarea*up*up]
    comps.sort(key=lambda c:(round(c[0][1]/(h*up/3)),c[0][0]))
    alpha=cv2.GaussianBlur(fg.astype(np.float32),(3,3),0)
    rgb=cv2.cvtColor(im,cv2.COLOR_BGR2RGB)
    for (s,i),nm in zip(comps,names):
        x,y,ww,hh=s[:4]; sel=(lab[y:y+hh,x:x+ww]==i)
        a=(alpha[y:y+hh,x:x+ww]*sel*255).astype(np.uint8)
        out=np.dstack([rgb[y:y+hh,x:x+ww],a]); Image.fromarray(out).save(f'assets/v7/{nm}.png',optimize=True); print(nm,ww,hh)
cut('5477c576075934ecc4c95f6062636e73ffb7df14fc8c79356a4d9a61abccf067.jpg',['chapel'])
cut('0987455b7a91fe18cddda4e8b38be4dd83e6565e4d55e95409c999baaec1174d.jpg',['shop_clothes','shop_flower','shop_bakery','shop_cafe','shop_book','house_red'])
cut('0fc3c23277b6723602a64e8b0c695785c1a4ac43eea6419e914e5def37b473ed.jpg',['fountain','playground','busstop','house_blue','house_lav','tree_pink'])
cut('8e31a1f5b6f1d1088776bc4a245865db795a27202bc9772c309504f13d4e9f37.jpg',['ic_talent','ic_shard','ic_candle','ic_fruit','ic_dove','ic_glass'],up=1,minarea=2000)
