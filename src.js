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

const trains=[];
Object.entries(lines).forEach(([id,line])=>{
  const count=id==='M1'?9:7;
  for(let i=0;i<count;i++){
    const t=make('g',{class:'train',style:`color:${line.color}`});t.append(make('circle',{class:'pulse',r:8}),make('circle',{r:6}));svg.append(t);
    trains.push({el:t,line,progress:i/count,direction:i%2?1:-1,speed:.000018+Math.random()*.000012});
  }
});

let last=performance.now();
function animate(now){const dt=Math.min(now-last,100);last=now;trains.forEach(t=>{t.progress+=t.direction*t.speed*dt;if(t.progress>1){t.progress=1;t.direction=-1}if(t.progress<0){t.progress=0;t.direction=1}const max=t.line.points.length-1,pos=t.progress*max,idx=Math.min(Math.floor(pos),max-1),f=pos-idx,a=t.line.points[idx],b=t.line.points[idx+1];t.el.setAttribute('transform',`translate(${a[0]+(b[0]-a[0])*f} ${a[1]+(b[1]-a[1])*f})`)});requestAnimationFrame(animate)}
requestAnimationFrame(animate);document.querySelector('#trainCount').textContent=trains.length;

const dialog=document.querySelector('#stationDialog');
function showStation(line,name){dialog.querySelector('h2').textContent=name;dialog.querySelector('.line-name').textContent=line.name;dialog.querySelector('.line-name').style.color=line.color;dialog.querySelector('.arrival strong').textContent=`${1+Math.floor(Math.random()*5)} хв`;dialog.showModal()}
dialog.querySelector('.close').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close()};
document.querySelectorAll('.legend button').forEach(btn=>btn.onclick=()=>{const active=btn.dataset.line;const was=btn.classList.contains('active');document.querySelectorAll('.legend button').forEach(b=>b.classList.toggle('dim',!was&&b!==btn));document.querySelectorAll('#metroMap>[data-line]').forEach(g=>g.style.opacity=was||g.dataset.line===active?'1':'.12');btn.classList.toggle('active',!was)});
setInterval(()=>document.querySelector('#clock').textContent=new Date().toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),1000);

// Live API integration point. Set VITE_METRO_API_URL when a stable, permitted feed is available.
const apiUrl=import.meta.env.VITE_METRO_API_URL;
if(apiUrl){fetch(apiUrl).then(r=>{if(!r.ok)throw Error();return r.json()}).then(()=>document.querySelector('#statusText').textContent='Дані наживо').catch(()=>document.querySelector('#statusText').textContent='Деморежим · API недоступне')}
