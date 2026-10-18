from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
root=Path(__file__).resolve().parent
files=sorted((root/'public/images').glob('*.jpg'),key=lambda p:int(''.join(filter(str.isdigit,p.stem))))+[root/'public/suite.jpg']
out=Image.new('RGB',(1080,((len(files)+5)//6)*145),'#f4f0e8');d=ImageDraw.Draw(out)
for i,p in enumerate(files):
 im=Image.open(p).convert('RGB');im.thumbnail((178,118));x=(i%6)*180;y=(i//6)*145;out.paste(im,(x+(180-im.width)//2,y));d.text((x+5,y+122),p.name,fill='#222222')
out.save(root/'image-inventory.jpg')
