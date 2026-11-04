import './style.css';

const lines = {
  M1:{name:'Червона лінія',color:'#ef3e42',points:[[70,190],[125,190],[180,190],[235,190],[290,190],[345,190],[400,190],[455,190],[510,190],[565,190],[620,190],[675,190],[730,190],[785,190],[840,190],[895,190]],stations:['Академмістечко','Житомирська','Святошин','Нивки','Берестейська','Шулявська','Політехнічний інститут','Вокзальна','Університет','Театральна','Хрещатик','Арсенальна','Дніпро','Гідропарк','Лівобережна','Лісова']},
  M2:{name:'Синя лінія',color:'#178bd5',points:[[465,30],[465,75],[465,120],[465,165],[465,215],[465,265],[465,315],[465,365],[465,415],[465,465],[465,515],[465,565],[465,615],[465,655]],stations:['Героїв Дніпра','Мінська','Оболонь','Почайна','Тараса Шевченка','Контрактова площа','Поштова площа','Майдан Незалежності','Площа Українських Героїв','Олімпійська','Палац «Україна»','Либідська','Деміївська','Теремки']},
  M3:{name:'Зелена лінія',color:'#25a66a',points:[[180,600],[225,555],[270,510],[315,465],[360,420],[405,375],[450,330],[495,285],[540,240],[585,285],[630,330],[675,375],[720,420],[765,465],[810,510],[855,555]],stations:['Сирець','Дорогожичі','Лук’янівська','Золоті ворота','Палац спорту','Кловська','Печерська','Звіринецька','Видубичі','Славутич','Осокорки','Позняки','Харківська','Вирлиця','Бориспільська','Червоний хутір']}
};

const svg=document.querySelector('#metroMap');
const ns='http://www.w3.org/2000/svg';
const make=(tag,attrs={})=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el};
const pathFor=pts=>'M '+pts.map(p=>p.join(' ')).join(' L ');

Object.entries(lines).forEach(([id,line])=>{
  const g=make('g',{'data-line':id});
  g.append(make('path',{d:pathFor(line.points),class:'track-shadow'}),make('path',{d:pathFor(line.points),class:'track',stroke:line.color}));
  line.points.forEach(([x,y],i)=>{
    const s=make('g',{class:'station',transform:`translate(${x} ${y})`,tabindex:'0',role:'button','aria-label':line.stations[i]});
    s.append(make('circle',{r:6}));
    const text=make('text',{x:id==='M2'?14:0,y:id==='M2'?4:(i%2?-14:22),'text-anchor':id==='M2'?'start':'middle'});text.textContent=line.stations[i];s.append(text);
    s.addEventListener('click',()=>showStation(line,line.stations[i]));g.append(s);
  });svg.append(g);
});

// Timetable model: deterministic positions calculated from Kyiv time. The model
// uses a typical interval for the current part of the day, 2.5 min between
// stations and a 25 sec dwell. It is deliberately labelled as calculated data.
const schedule={
  M1:{segment:150,dwell:25,offset:0},
  M2:{segment:145,dwell:25,offset:55},
  M3:{segment:155,dwell:25,offset:110}
};
const kyivParts=()=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Kyiv',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date()).reduce((a,p)=>(a[p.type]=Number(p.value),a),{});
const secondsNow=()=>{const p=kyivParts();return p.hour*3600+p.minute*60+p.second};
function intervalAt(sec){
  const h=sec/3600;
  if(h<6||h>=24)return 0;
  if((h>=7&&h<10)||(h>=17&&h<20))return 180;
  if(h>=6&&h<7)return 420;
  if(h>=10&&h<17)return 300;
  if(h>=20&&h<22)return 420;
  return 600;
}
const trains=[];
function createTrains(){
  trains.splice(0).forEach(t=>t.el.remove());
  const now=secondsNow(),interval=intervalAt(now);
  if(!interval){document.querySelector('#trainCount').textContent='0';return}
  Object.entries(lines).forEach(([id,line])=>{
    const cfg=schedule[id],leg=(line.points.length-1)*cfg.segment+(line.points.length-2)*cfg.dwell;
    const perDirection=Math.ceil(leg/interval);
    for(let direction=0;direction<2;direction++)for(let i=0;i<perDirection;i++){
      const el=make('g',{class:'train',style:`color:${line.color}`});el.append(make('circle',{class:'pulse',r:8}),make('circle',{r:6}));svg.append(el);
      trains.push({el,line,cfg,direction,startOffset:cfg.offset+i*interval,leg});
    }
  });
  document.querySelector('#trainCount').textContent=trains.length;
}
function trainProgress(t,now){
  const serviceStart=6*3600;
  let elapsed=now-serviceStart-t.startOffset;
  while(elapsed<0)elapsed+=t.leg;
  const trip=elapsed%t.leg;
  const unit=t.cfg.segment+t.cfg.dwell;
  const segment=Math.min(Math.floor(trip/unit),t.line.points.length-2);
  const within=trip-segment*unit;
  let progress=(segment+Math.min(within/t.cfg.segment,1))/(t.line.points.length-1);
  if(t.direction)progress=1-progress;
  return progress;
}
function animate(){
  const now=secondsNow();
  trains.forEach(t=>{const progress=trainProgress(t,now),max=t.line.points.length-1,pos=progress*max,idx=Math.min(Math.floor(pos),max-1),f=pos-idx,a=t.line.points[idx],b=t.line.points[idx+1];t.el.setAttribute('transform',`translate(${a[0]+(b[0]-a[0])*f} ${a[1]+(b[1]-a[1])*f})`)});
  requestAnimationFrame(animate);
}
createTrains();requestAnimationFrame(animate);
setInterval(createTrains,60_000);

const dialog=document.querySelector('#stationDialog');
function showStation(line,name){dialog.querySelector('h2').textContent=name;dialog.querySelector('.line-name').textContent=line.name;dialog.querySelector('.line-name').style.color=line.color;dialog.querySelector('.arrival strong').textContent=`${1+Math.floor(Math.random()*5)} хв`;dialog.showModal()}
dialog.querySelector('.close').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close()};
document.querySelectorAll('.legend button').forEach(btn=>btn.onclick=()=>{const active=btn.dataset.line;const was=btn.classList.contains('active');document.querySelectorAll('.legend button').forEach(b=>b.classList.toggle('dim',!was&&b!==btn));document.querySelectorAll('#metroMap>[data-line]').forEach(g=>g.style.opacity=was||g.dataset.line===active?'1':'.12');btn.classList.toggle('active',!was)});
setInterval(()=>document.querySelector('#clock').textContent=new Date().toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),1000);

// Live API integration point. Set VITE_METRO_API_URL when a stable, permitted feed is available.
document.querySelector('#statusText').textContent='Розрахунковий рух';
