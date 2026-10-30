import sys, glob, os
from PIL import Image
N='/workspace/mk/norm'; O=sys.argv[1]; os.makedirs(O,exist_ok=True)
for ch in ('player','boy'):
  for f in sorted(glob.glob(f'{N}/{ch}_hair_*_S.png')):
    h=f.split('_hair_')[1][:-6]; row=Image.new('RGBA',(5*200,180),(140,195,120,255))
    for i,d in enumerate(['S','SW','W','NW','N']):
      im=Image.open(f'{N}/{ch}_base_{d}.png').convert('RGBA'); im.alpha_composite(Image.open(f'{N}/{ch}_hair_{h}_{d}.png').convert('RGBA'))
      row.alpha_composite(im.crop((0,0,200,180)),(i*200,0))
    row.resize((3000,540),Image.LANCZOS).save(f'{O}/{ch}_{h}.png')
