const stocks={
  "7203":{name:"トヨタ自動車",price:"2,894.5円",change:"+1.24%",score:78,probs:[56,26,18]},
  "8306":{name:"三菱UFJフィナンシャル・グループ",price:"1,782.0円",change:"+0.82%",score:74,probs:[52,30,18]},
  "9984":{name:"ソフトバンクグループ",price:"10,245円",change:"-0.56%",score:63,probs:[44,31,25]},
  "4881":{name:"ファンペップ",price:"138円",change:"+2.22%",score:69,probs:[49,29,22]}
};
const $=s=>document.querySelector(s);
function renderStock(code){const s=stocks[code]||stocks["7203"];$("#stockCode").textContent=stocks[code]?code:"7203";$("#stockName").textContent=s.name;$("#stockPrice").textContent=s.price;$("#stockChange").textContent=s.change;$("#stockChange").className=s.change.startsWith("-")?"down":"up";$("#score").textContent=s.score;$("#upProb").textContent=s.probs[0]+"%";$("#flatProb").textContent=s.probs[1]+"%";$("#downProb").textContent=s.probs[2]+"%";drawChart(code)}
$("#searchBtn").addEventListener("click",()=>renderStock($("#searchInput").value.trim()));
$("#searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")renderStock(e.target.value.trim())});
$("#themeBtn").addEventListener("click",()=>document.body.classList.toggle("dark"));
$("#periods").addEventListener("click",e=>{if(e.target.tagName!=="BUTTON")return;document.querySelectorAll("#periods button").forEach(b=>b.classList.remove("active"));e.target.classList.add("active");$("#periodLabel").textContent=e.target.dataset.period;drawChart($("#stockCode").textContent+e.target.dataset.period)});
function seeded(seed){let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619);return()=>((h=Math.imul(h^h>>>15,2246822519))>>>0)/4294967296}
function movingAvg(arr,n){return arr.map((_,i)=>{if(i<n-1)return null;let sum=0;for(let j=i-n+1;j<=i;j++)sum+=arr[j];return sum/n})}
function drawChart(seed="7203"){const c=$("#chart"),ctx=c.getContext("2d"),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);const rnd=seeded(seed);let v=100;const data=[];for(let i=0;i<70;i++){v+=((rnd()-.46)*4);data.push(v)}const avgs=[movingAvg(data,5),movingAvg(data,15),movingAvg(data,30)];const all=data.filter(Number.isFinite);const min=Math.min(...all)-5,max=Math.max(...all)+5;const x=i=>40+i*(w-70)/(data.length-1),y=v=>20+(max-v)*(h-55)/(max-min);ctx.strokeStyle="#dbe3ef";ctx.lineWidth=1;for(let i=0;i<5;i++){const yy=25+i*(h-70)/4;ctx.beginPath();ctx.moveTo(35,yy);ctx.lineTo(w-20,yy);ctx.stroke()}ctx.strokeStyle="#5b5ce2";ctx.lineWidth=3;ctx.beginPath();data.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.stroke();["#ef4444","#2563eb","#10b981"].forEach((color,k)=>{ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();let started=false;avgs[k].forEach((v,i)=>{if(v==null)return;if(!started){ctx.moveTo(x(i),y(v));started=true}else ctx.lineTo(x(i),y(v))});ctx.stroke()})}
renderStock("7203");
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
