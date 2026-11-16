import json, uuid
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
# Transcribed from repository menu page images; code, English, Korean, base CAD price, description.
rows='''A1|Fried Dumplings|군만두|7.49|6 beef dumplings.
A2|Spring Rolls|스프링롤|7.49|6 vegetable spring rolls.
A3|Kimari|김말이|7.99|6 seaweed glass noodle rolls.
A4|Japchae|잡채|11.99|Glass noodles and mixed vegetables.
A5|Spicy Rice Cake|떡볶이|14.49|Spicy rice cakes, fishcake and mixed vegetables. Cheese +$3.
A6|Rose Rice Cake|로제 떡볶이|15.99|Creamy rice cakes, fishcake, mixed vegetables, bacon and sausage.
A7|Grilled Mackerel|고등어 구이|11.99|
A8|Grilled Yellow Corvina|조기 구이|12.99|
A9|Pan-fried Baby Octopus|쭈꾸미 볶음|14.49|Spicy baby octopus and mixed vegetables.
A10|White Rice|밥|2.99|
B1|Pork Bone Soup|감자탕|15.99|Spicy pork bone, cabbage, potato and perilla seed. Includes rice.
B2|Kimchi Soup|김치찌개|15.99|Spicy kimchi, tofu, vegetables, ricecake, mushroom and glass noodles. Vegetable; pork +$2. Includes rice.
B3|Soybean Paste Soup|된장찌개|14.99|Soybean paste, onion and zucchini. Vegetable; beef or seafood +$2. Includes rice.
B4|Spicy Soft Tofu Soup|순두부찌개|14.99|Spicy soft tofu, onion, zucchini and egg. Vegetable; beef or seafood +$2. Includes rice.
B5|Spicy Beef Soup|육개장|18.99|Spicy brisket, taro root, glass noodles, mixed vegetables, egg and mushroom. Includes rice.
B6|Short Rib Beef Soup|갈비탕|19.99|Mild short rib beef, glass noodles, egg, green onion, mushroom. Includes rice.
B7|Dumpling & Rice Cake Soup|떡만두국|17.49|Mild beef dumplings, ricecake, green onion, mushroom and egg. Includes rice.
B8|Bulgogi Soup|뚝배기 불고기|19.99|Mild marinated sirloin beef, mushroom, ricecake, glass noodles and green onion. Includes rice.
B9|Chicken Soup|삼계탕|18.99|Mild chicken soup with herbal ingredients, mushroom and green onion. Includes rice.
C1|Ozen Kimchi Fried Rice|오젠 김치 볶음밥|21.99|House special kimchi fried rice with cubed pork belly. Cheese +$3.
C2|Stone Bowl Bibimbap|돌솥비빔밥|16.49|Carrot, spinach, mushroom, radish, zucchini, egg and rice. Choice of beef or tofu.
C3|Katsu|돈까스 / 치킨까스|16.49|Pork or chicken cutlet, cabbage salad and rice.
C4|Bulgogi Japchae on Stone Bowl|불고기 잡채덮밥|18.49|Bulgogi beef, stir-fried glass noodles and mixed vegetables, served on a sizzling bowl.
C5|Spicy Pork on Stone Bowl|제육덮밥|17.99|Spicy pork, mixed vegetables and rice, served on a sizzling stone bowl.
C6|Spicy Chicken on Stone Bowl|치킨덮밥|16.99|Spicy chicken, mixed vegetables and rice, served on a sizzling stone bowl.
C7|Jajang on Rice|자장덮밥|13.99|Black bean paste, pork, onion and rice.
C8|Stir-fried Rice|볶음밥|15.99|Vegetable $15.99; shrimp or beef $17.99. Carrot, peas, corn and egg.
C9|Grilled Mackerel Meal|고등어 구이 정식|19.99|Served with rice.
C10|Grilled Yellow Corvina Meal|조기 구이 정식|23.99|Served with rice.
D1|LA Kalbi on Hot Plate|LA 갈비 정식|29.99|Marinated short rib beef, onion and rice.
D2|Pork Kalbi on Hot Plate|돼지갈비 정식|27.99|Marinated pork shoulder, onion and rice.
D3|Bulgogi on Hot Plate|불고기 정식|25.99|Marinated sirloin beef, mixed vegetables, mushroom and rice.
D4|Spicy Chicken on Hot Plate|닭갈비 정식|22.99|Spicy chicken, mixed vegetables and rice. Cheese +$3.
D5|Spicy Pork on Hot Plate|제육 정식|23.49|Spicy pork belly, mixed vegetables and rice. Cheese +$3.
D6|Spicy Octopus on Hot Plate|쭈꾸미 정식|24.49|Spicy baby octopus, mixed vegetables and rice.
D7|Jajang Myun|자장면|13.99|Black bean paste, pork and onion. Extra noodles +$3.
D8|Pan-fried Seafood Jajang Myun|간자장|16.49|Black bean paste, mixed seafood, onion and egg. Extra noodles +$3.
D9|Spicy Seafood Noodles|짬뽕|17.49|Spicy mixed seafood, mussels, vegetables and mushroom. Extra noodles +$3.
D10|Spicy Pan-fried Seafood Noodles|볶음짬뽕|16.50|Spicy mixed seafood, mussels, vegetables and mushroom. Extra noodles +$3.
D11|Spicy Beef Noodles|육갈탕면|19.99|Spicy brisket, short rib, mushroom, taro root and egg. Extra noodles +$3.
D12|Pork Noodles|돼지칼국수|16.99|Creamy pork belly, soybean paste, ginger, vegetables and mushroom. Extra noodles +$3.
D13|Mul Nang Myun|물냉면|18.50|Seasonal. Buckwheat noodles, radish, cucumber, brisket and egg. Extra noodles +$3.
D14|Bibim Nang Myun|비빔냉면|18.50|Seasonal. Buckwheat noodles, radish, cucumber, brisket and egg. Extra noodles +$3.
E1|Seafood Pancake|해물파전|18.99|Mixed seafood, green onion and egg. Cheese +$3.
E2|Kimchi Bacon Pancake|베이컨 김치전|18.99|Crispy Korean pancake with spicy kimchi and bacon. Cheese +$3.
E3|Stir-fried Kimchi & Pork with Tofu|두부김치|29.99|Spicy kimchi, pork belly, tofu and mixed vegetables.
E4|Tangsuyuk|탕수육|29.99|Fried pork or chicken, mixed vegetables and sweet-and-sour sauce.
E5|Kanpungi|깐풍기|29.99|Fried pork or chicken, carrot, peas, corn and spicy-sour sauce.
E6|Yuringi|유린기|29.99|Fried chicken thigh with sweet-and-sour soy sauce.
E7|Spicy Rice Cake Plate|떡볶이 정식|26.99|Ricecake, fishcake, vegetables, egg, 2 kimari and 2 dumplings. Cheese +$3; ramen +$3; both +$5.
E8|Japchae Plate|잡채|23.49|Glass noodles, mixed vegetables and beef.
E9|BBQ Pork Belly|삼겹살 정식|36.99|Korean style BBQ pork belly and onion. Includes 2 rice. Combo soup +$7.
E10|Jokbal|족발|39.99|Korean style steamed pork hock.
E11|Spicy Jokbal|불족발|41.99|Korean style spicy steamed pork hock. Cheese +$3.
E12|Honey Garlic Jokbal|허니갈릭 족발|40.99|Korean style honey garlic steamed pork hock.
F1|Gamjatang Hot Pot|감자탕 전골|34.99|Pork bone, cabbage, mixed vegetables, ricecake, mushroom and perilla seed. Includes 2 rice.
F2|Kimchi Hot Pot|김치 전골|33.99|Kimchi, mixed vegetables, pork belly, tofu, ricecake, mushroom and ramen. Includes 2 rice.
F3|Spicy Sausage Hot Pot|부대찌개|36.99|Kimchi, mixed vegetables, spam, sausage, ricecake, mushroom, pork belly, ramen and cheese. Includes 2 rice.
F4|Dumpling Hot Pot|만두 전골|34.99|Beef dumplings, mixed vegetables, ricecake, brisket and wheat noodles. Includes 2 rice.
F5|Bulgogi Hot Pot|불고기 전골|43.99|Marinated sirloin, mixed vegetables, glass noodles, ricecake and mushroom. Includes 2 rice.
F6|Octopus & Pork Hot Pot|쭈꾸미 삼겹살 전골|43.99|Spicy pork belly, baby octopus, mixed vegetables, glass noodles, ricecake and mushroom. Includes 2 rice.
F7|Spicy Rice Cake Hot Pot|떡볶이 전골|34.99|Ricecake, fishcake, mixed vegetables, egg, mushroom and ramen. Includes 2 rice.
F8|Spicy Seafood Hot Pot|해물 전골|47.99|Mixed seafood, shrimp, mussels, whole squid, mixed vegetables and wheat noodles. Includes 2 rice.
F9|Spicy Chicken with Corn Cheese Ring|매운 치킨 + 콘치즈 링|43.99|Spicy chicken, mixed vegetables, potato, corn and cheese. Includes 2 rice.
F10|Spicy Pork with Corn Cheese Ring|매운 제육 + 콘치즈 링|43.99|Spicy pork, mixed vegetables, potato, corn and cheese. Includes 2 rice.
F11|Spicy Pork & Octopus with Corn Cheese Ring|매운 제육 & 쭈꾸미 + 콘치즈 링|43.99|Spicy pork, spicy octopus, mixed vegetables, potato, corn and cheese.
G1|Soju Fresh|소주 프레시|22.00|Korean rice distilled spirits.
G2|Soju Classic|소주 클래식|22.00|
G3|Soju Green Grape|소주 청포도|22.00|
G4|Soju Grapefruit|소주 자몽|22.00|
G5|Soju Plum|소주 자두|22.00|
G6|Soju Strawberry|소주 딸기|22.00|
G7|Makgeolli|막걸리|19.99|Korean rice wine.
G8|Sapporo|사포로|9.49|
G9|Molson Canadian|캐내디언|9.49|
G10|Coors Light|쿨스라이트|9.49|
G11|House Red Wine|레드와인|5.99|Cabernet Sauvignon, 6 oz.
G12|House White Wine|화이트와인|5.99|Sauvignon Blanc, 6 oz.
G13|Milkis|밀키스|3.25|Korean cream soda.
G14|Iced Tea|아이스티|2.99|
G15|Coke|콜라|2.99|
G16|Diet Coke|다이어트 콜라|2.99|
G17|Sprite|스프라이트|2.99|
G18|Ginger Ale|진저에일|2.99|'''
# Exact recent takeout source, not inferred from dining prices/descriptions.
takeout='''A1|Fried Dumplings|군만두|7.49|6 beef dumplings.
A2|Spring Rolls|스프링롤|7.49|6 vegetable spring rolls.
A3|Kimari|김말이|8.49|6 seaweed glass noodle rolls.
A4|Japchae|잡채|12.99|
A5|Spicy Rice Cake|떡볶이|14.49|Cheese +$3.
A6|Rose Rice Cake|로제 떡볶이|16.49|
A7|Grilled Mackerel|고등어 구이|11.99|
A8|Grilled Yellow Corvina|조기 구이|12.99|
A9|Pan-fried Baby Octopus|쭈꾸미 볶음|14.49|
A10|White Steam Rice|밥|2.99|
B1|Pork Bone Soup|감자탕|17.49|Includes rice.
B2|Kimchi Soup|김치찌개|16.99|Vegetable; pork +$2. Includes rice.
B3|Soybean Paste Soup|된장찌개|15.49|Vegetable; beef or seafood +$2. Includes rice.
B4|Spicy Soft Tofu Soup|순두부찌개|15.49|Vegetable; beef or seafood +$2. Includes rice.
B5|Spicy Beef Soup|육개장|18.99|Includes rice.
B6|Short Rib Beef Soup|갈비탕|20.49|Includes rice.
B7|Dumpling & Rice Cake Soup|떡만두국|17.49|Includes rice.
B8|Bulgogi Soup|뚝배기 불고기|20.99|Includes rice.
B9|Spicy Gopchang Soup|육곱탕|20.99|Includes rice.
C1|Ozen Kimchi Fried Rice|오젠 김치 볶음밥|23.99|Cheese +$3.
C2|Stone Bowl Bibimbap|돌솥비빔밥|16.49|Vegetables, egg and rice. Choice of beef or tofu.
C3|Katsu|돈까스 / 치킨까스|18.49|Pork or chicken cutlet, cabbage salad and rice.
C4|Bulgogi Japchae on Rice|불고기 잡채덮밥|19.49|
C7|Jajang on Rice|자장덮밥|14.49|
C8|Stir-fried Rice|볶음밥|15.99|Vegetable $15.99; shrimp or beef $17.99.
C9|Grilled Mackerel Meal|고등어 구이 정식|21.49|
C10|Grilled Yellow Corvina Meal|조기 구이 정식|23.99|
D1|LA Kalbi on Hot Plate|LA 갈비 정식|29.99|
D2|Pork Kalbi on Hot Plate|돼지갈비 정식|24.99|
D3|Bulgogi on Hot Plate|불고기 정식|28.49|
D4|Spicy Chicken on Hot Plate|닭갈비 정식|26.49|Cheese +$3.
D5|Spicy Pork on Hot Plate|제육 정식|26.49|Cheese +$3.
D6|Spicy Baby Octopus on Hot Plate|쭈꾸미 정식|27.49|Cheese +$3.
D7|Jajang Myun|자장면|14.99|Extra noodles +$3.
D9|Spicy Seafood Noodle Soup|짬뽕|19.49|Extra noodles +$3.
D10|Spicy Stir-fried Seafood Noodles|볶음짬뽕|17.49|Extra noodles +$3.
D11|Spicy Beef Noodles Soup|육갈탕면|21.49|Extra noodles +$3.
D12|Pork Belly Noodles Soup|돼지칼국수|18.49|Extra noodles +$3.
E1|Seafood Green Onion Pancake|해물파전|20.49|Cheese +$3.
E2|Kimchi Bacon Pancake|베이컨 김치전|20.49|Cheese +$3.
E3|Stir-fried Kimchi & Pork with Tofu|두부김치|29.99|
E4|Tangsuyuk|탕수육|31.49|Fried pork or chicken, vegetables and sweet-and-sour sauce.
E5|Kanpungi|깐풍기|31.49|Fried pork or chicken, carrot, peas, corn and spicy-sour sauce.
E7|Spicy Rice Cake Plate|떡볶이 정식|27.49|Cheese +$3; ramen +$3; both +$5.
E8|Japchae Plate|잡채|26.49|
E9|BBQ Pork Belly|삼겹살 정식|36.99|Includes 2 rice. Combo soup +$7.
E10|Jokbal|족발|39.99|
E11|Spicy Jokbal|불족발|41.99|Cheese +$3.
E13|Spicy Braised Pork Bone|매운 감자뼈찜|32.49|
F1|Porkbone Hot Pot|감자탕 전골|36.49|Includes 2 rice.
F3|Spicy Sausage Hot Pot|부대찌개|37.99|Includes 2 rice.
F4|Dumpling Hot Pot|만두 전골|37.99|Includes 2 rice.
F5|Bulgogi Hot Pot|불고기 전골|44.99|Includes 2 rice.
F6|Octopus & Pork Hot Pot|쭈꾸미 삼겹살 전골|44.99|Includes 2 rice.
F7|Spicy Rice Cake Hot Pot|떡볶이 전골|36.49|Includes 2 rice.
F10|Spicy Bulgogi Gopchang Hot Pot|매운 불고기 곱창 전골|47.99|Includes 2 rice.
F11|Spicy Seafood Gopchang Hot Pot|쭈곱새 전골|49.99|Includes 2 rice.
G1|Soju Fresh|소주 프레시|22.00|
G2|Soju Classic|소주 클래식|22.00|
G3|Soju Green Grape|소주 청포도|22.00|
G4|Soju Grapefruit|소주 자몽|22.00|
G5|Soju Plum|소주 자두|22.00|
G6|Soju Strawberry|소주 딸기|22.00|
G7|CANMAK (Makgeolli)|캔막걸리|19.99|355 ml, 5%. Original, peach, grape, mango.
G8|Sapporo|사포로|9.49|
G9|Molson Canadian|캐내디언|9.49|
G10|Coors Light|쿨스라이트|9.49|
G13|Milkis|밀키스|3.25|
G14|Iced Tea|아이스티|2.99|
G15|Coke|콜라|2.99|
G16|Diet Coke|다이어트 콜라|2.99|
G17|Sprite|스프라이트|2.99|
G18|Ginger Ale|진저에일|2.99|
H1|Ozen Kimchi Salad|오젠 김치|4.00|250 g.
H2|Ozen Cucumber Dish|오젠 오이김치|5.00|300 g.
H3|Ozen Pickle Dish|오젠 장아찌|5.00|300 g.'''
cats={'A':'Appetizers · 전채류','B':'Korean Soups · 탕류','C':'Specialities · 식사류','D':'Hot Plate · 철판류','E':'Platters · 단품류','F':'Hot Pots · 전골류','G':'Liquor · 주류','H':'Ozen Market · 오젠마켓'}
def category(code):
 if code.startswith('D') and int(code[1:])>=7: return 'Noodles · 면류'
 if code.startswith('F') and int(code[1:])>=9: return 'Barbecue · 바비큐'
 if code.startswith('G') and int(code[1:])>=13: return 'Beverages · 음료'
 return cats[code[0]]
def parse(text,kind):
 result=[]
 for i,row in enumerate(text.splitlines()):
  code,en,ko,price,desc=row.split('|')
  result.append({'id':str(uuid.uuid5(uuid.NAMESPACE_URL,'https://ozenlondon.ca/import/2026-11/'+kind+'/'+code)), 'restaurant':'korea','menu_type':kind,'category':category(code),'name_en':en,'name_ko':ko,'description':desc,'price':float(price),'image_url':'','visible':False,'sold_out':False,'sort_order':i*10,'code':code,'source_page':0,'review_note':''})
 return result
dining=parse(rows,'dining');take=parse(takeout,'takeout')
# Extract food photographs from the menu page document. Boxes exclude labels and prices.
boxes={}
def assign(page,codes,rects):
 for c,b in zip(codes,rects):boxes[c]=(page,b)
assign(2,[f'A{i}' for i in range(1,11)],[(65,280,425,500),(455,280,820,500),(845,280,1225,500),(65,715,425,950),(455,715,820,950),(845,715,1225,950),(65,1190,345,1365),(355,1190,635,1365),(650,1190,930,1365),(960,1190,1225,1365)])
assign(3,[f'B{i}' for i in range(1,10)],[(x,y,x+365,y+250) for y in [245,710,1175] for x in [65,455,845]])
assign(4,[f'C{i}' for i in range(1,7)],[(x,y,x+365,y+235) for y in [245,715] for x in [65,455,845]])
assign(4,[f'C{i}' for i in range(7,11)],[(x,1220,x+275,1370) for x in [65,355,650,950]])
assign(5,[f'D{i}' for i in range(1,7)],[(x,y,x+365,y+170) for y in [175,475] for x in [65,455,845]])
assign(5,[f'D{i}' for i in range(7,15)],[(x,y,x+275,y+145) for y in [945,1370] for x in [65,355,650,950]])
assign(6,[f'E{i}' for i in range(1,13)],[(x,y,x+365,y+150) for y in [220,590,965,1310] for x in [65,455,845]])
assign(7,[f'F{i}' for i in range(1,9)],[(x,y,x+275,y+165) for y in [245,655] for x in [65,355,650,950]])
assign(7,[f'F{i}' for i in range(9,12)],[(x,1290,x+365,1500) for x in [65,455,845]])
assign(8,[f'G{i}' for i in range(1,19)],[(x,y,x+175,y+225) for y in [220,695,1265] for x in [65,260,455,650,845,1040]])
for item in dining:
 page,box=boxes[item['code']];item['source_page']=page
 image=Image.open(ROOT/f'public/images/ozen-korea/ozen_korea_menu/page{page}.jpg')
 item['photo_box']=list(box)
 item['image_url']=''
 item['review_note']='기존 웹사이트 이미지 기준. 현재 다이닝 가격·판매 여부 확인 필요.'
bycode={i['code']:i for i in dining}
for item in take:
 old=bycode.get(item['code']);code=item['code']
 if code in ['F10','F11']:item['category']=cats['F']
 if old and code not in ['B9','F10','F11','G7']:
  item['photo_box']=old['photo_box'];item['source_page']=old['source_page']
  if old['price']!=item['price']:item['review_note']=f"다이닝 원본 ${old['price']:.2f} / 테이크아웃 문서 ${item['price']:.2f}. 가격 차이 확인."
 elif old:
  item['review_note']=f"동일 번호지만 다이닝 원본은 {old['name_ko']}. 테이크아웃은 {item['name_ko']}. 사진 연결 안 함."
 else:item['review_note']='기존 다이닝 이미지에 없는 메뉴. 사진 추가 필요.'
(ROOT/'data/menu-import.json').write_text(json.dumps(dining+take,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'dining':len(dining),'takeout':len(take),'photos':len(boxes),'price_differences':sum('가격 차이' in x['review_note'] for x in take)},ensure_ascii=False))
