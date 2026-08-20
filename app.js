/* ============================================================
   我在宋朝会出嫁吗 v1 · 小红书小工具版引擎（姊妹篇，维度结算版）
   适配规则（fe 小工具开发者文档）：
   - 纯离线：事件数据经 <script src> 注入 window.EVENTS_X，禁止 fetch
   - 无内联脚本/行内事件：全部 addEventListener
   - 分享：xhs.miniTool.writeTempFile + postNote；浏览器预览降级为下载
   ============================================================ */

/* 全局错误兜底：资源或脚本异常时在加载屏给出可读提示 */
window.addEventListener("error",function(e){
  var p=document.getElementById("load-err");
  var cover=document.querySelector("#s-cover.active");
  if(!cover && p){p.textContent="载入出错："+(e.message||(e.target&&e.target.src)||"资源加载失败");}
  var ld=document.getElementById("s-loading");
  if(!cover && ld) ld.classList.add("active");
},true);

const CONFIG = {
  jobs: ["落魄书生","染坊之女","矾楼侍女","夜市学徒","药铺杂役","行脚商人"],
  skills: ["识字断文","心算记账","医理药理","厨艺烹饪","妆扮手艺","蹴鞠武艺",
           "琴棋书画","商贾之道","农桑常识","工巧制作","相面识人","酒令应酬"],
  styles: [
    {id:"lowkey", name:"低调蛰伏", desc:"少说话多做事，先活下来"},
    {id:"social", name:"广结善缘", desc:"见人就笑，朋友多了路好走"},
    {id:"bold",   name:"敢闯敢赌", desc:"富贵险中求，汴京遍地是机会"},
    {id:"elegant",name:"风雅自持", desc:"宁可清贫，不可无趣"}
  ],
  branches: {
    A:{name:"🌸 商户之女", data:"EVENTS_A", char:"assets/char-A.jpg", role:"有嫁妆有底气"},
    B:{name:"🏮 樊楼歌伎", data:"EVENTS_B", char:"assets/char-B.jpg", role:"才名满汴京"},
    C:{name:"📚 官宦才女", data:"EVENTS_C", char:"assets/char-C.jpg", role:"词名动京师"},
    D:{name:"🍵 茶坊掌柜", data:"EVENTS_D", char:"assets/char-D.jpg", role:"自己能挣钱"},
    E:{name:"🌾 乡间孤女", data:"EVENTS_E", char:"assets/char-E.jpg", role:"全靠自己"}
  },
  dims: ["才华","名声","家世","情缘","自主"],
  totalDays: 120,
  heresyMax: 2,
  saveKey: "jgcqm_save_v1"
};

/* rare 为静态稀有度描述（离线环境无计数后端，按预设写死） */
const ENDINGS = {
  liangyuan: {emoji:"🌸", title:"良缘 · 千古知音", rare:"不足 5% 的玩家走到了这里",
    hook:"1101 年，汴京最聪明的女子出嫁了。",
    source:"建中靖国元年，李清照嫁赵明诚——《金石录后序》。"},
  zizai:    {emoji:"🕊️", title:"自在", rare:"敢不嫁的人不多",
    hook:"恭喜，你没有嫁出去。但你活成了另一个版本的李清照。",
    source:"宋代女子奁产为私产，不嫁亦可自立——《宋刑统》。"},
  jiangjiu: {emoji:"💍", title:"将就能过", rare:"最普遍的人生",
    hook:"你嫁出去了。后来你学会了在规矩里写诗。",
    source:"父母之命媒妁之言，六礼备而后行——《东京梦华录·娶妇》。"},
  mingnv:   {emoji:"🏮", title:"汴京名女子", rare:"才名换来的自由",
    hook:"全汴京都读过你的词，没人敢娶你。",
    source:"宋代才女名动京师者，议婚反难——才高则婿难择。"},
  wuji:     {emoji:"🌧️", title:"无疾而终", rare:"议婚季就这么过去了",
    hook:"父亲说再等等。她不知道自己在等谁。",
    source:"宋代议婚重门第年岁，蹉跎者有之。"},
  baolu:    {emoji:"💀", title:"失名", rare:"大多数穿越者的真实归宿",
    hook:"汴京的嘴，比媒人的笔快。",
    source:"宋代闺誉即性命，一言可毁一门亲事。"}
};

const NOTE_PRESET = {
  title: "我在宋朝会出嫁吗",
  content: "穿越回1101年的汴京议婚季，我的宋朝人生结局是……5种身份5个维度，测测你会活成谁？",
  tags: "#小红书vibecoding大赛 #国风vibecoding #宋朝 #李清照 #互动游戏"
};

/* 里程碑：非阻塞分享卡（doc 要求端能力必须用户手势触发，故做成印章落下+主动分享） */
const MILESTONES = [
  {day:10,  emoji:"🌸", title:"及笄",     hook:"母亲为我绾起长发。从今天起，我就是「待字闺中」的人了。", rare:"议婚季正式开始"},
  {day:40,  emoji:"🏮", title:"见过世面", hook:"相看过了、推辞过了、也心动过了。媒人的套路，我熟了。", rare:"一半的人在这里就草草嫁了"},
  {day:90,  emoji:"📜", title:"待嫁",     hook:"婚期将近。嫁妆单子我亲自过目——那是我的底气，谁也别想动。", rare:"坚持到这里的人，都为自己争过"}
];

/* 感情线走到深处时，结局卡钩子追加专属一句 */
const ROMANCE_HOOK = {
  liangyuan:" 赌书泼茶二十六年，值得。",
  zizai:" 青梅那一眼，我不后悔。",
  jiangjiu:" 心里那个人，就让他住在词里。",
  mingnv:" 他托人捎来一句：你的词，我都读了。",
  wuji:" 或许等的不是谁，是一个自己做主的机会。",
  baolu:" 到死都记得秋千架下那一眼。"
};

const UI = {
  go(id){
    document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    window.scrollTo(0,0);
  },
  el(tag, cls, html){
    const e=document.createElement(tag);
    if(cls) e.className=cls;
    if(html!=null) e.innerHTML=html;
    return e;
  }
};

const Engine = {
  state:null,

  init(){
    document.getElementById("btn-start").addEventListener("click", ()=>UI.go("s-route"));
    document.getElementById("btn-resume").addEventListener("click", ()=>Engine.resume());
    document.getElementById("btn-share").addEventListener("click", ()=>Engine.share());
    document.getElementById("btn-replay").addEventListener("click", ()=>Engine.reset());
    document.getElementById("btn-stamp-share").addEventListener("click", ()=>Engine.shareStamp());
    document.getElementById("btn-stamp-continue").addEventListener("click", ()=>Engine.renderEvent());
    document.getElementById("btn-stamps").addEventListener("click", ()=>Engine.renderStamps());
    document.getElementById("btn-stamps-back").addEventListener("click", ()=>{
      if(Engine.state && Engine.state.events.length && !Engine.state.ended) Engine.renderEvent();
      else UI.go("s-cover");
    });
    document.getElementById("skill-next").addEventListener("click", ()=>{
      if(Engine.state.skills.length===2) UI.go("s-style");
    });

    const jl=document.getElementById("job-list");
    CONFIG.jobs.forEach(j=>{
      const b=UI.el("button","btn",j);
      b.addEventListener("click",()=>{Engine.state=Engine.blankState(); Engine.state.job=j; UI.go("s-skill");});
      jl.appendChild(b);
    });

    const sl=document.getElementById("skill-list");
    const picked=new Set();
    CONFIG.skills.forEach(s=>{
      const b=UI.el("button","btn",s);
      b.addEventListener("click",()=>{
        if(picked.has(s)){picked.delete(s);b.classList.remove("primary");}
        else if(picked.size<2){picked.add(s);b.classList.add("primary");}
        document.getElementById("skill-count").textContent=picked.size+"/2";
        document.getElementById("skill-next").disabled = picked.size!==2;
        Engine.state && (Engine.state.skills=[...picked]);
      });
      sl.appendChild(b);
    });

    const yl=document.getElementById("style-list");
    CONFIG.styles.forEach(s=>{
      const b=UI.el("button","btn",`${s.name}<br><small style="color:var(--faint)">${s.desc}</small>`);
      b.addEventListener("click",()=>{Engine.state.style=s.id; UI.go("s-route");});
      yl.appendChild(b);
    });

    /* ---------- 叠卡式选人：上下滑动翻牌，点当前牌确认 ---------- */
    const deck=document.getElementById("branch-deck");
    const dots=document.getElementById("deck-dots");
    const keys=Object.keys(CONFIG.branches);
    let cur=0, dragY=null, dragMoved=0;
    const cards=keys.map((k,i)=>{
      const v=CONFIG.branches[k];
      const ready = typeof window[v.data] !== "undefined";
      const b=UI.el("button","deck-card");
      b.type="button";
      const img=UI.el("img","char-img"); img.alt=v.name; img.draggable=false;
      // CDN 偶发断流：失败自动重试 2 次（带缓存穿透参数）
      let tries=0;
      const loadImg=()=>{ img.src=v.char+(tries?`?r=${tries}`:""); };
      img.addEventListener("error",()=>{ if(++tries<=2) setTimeout(loadImg,400*tries); });
      loadImg();
      b.appendChild(img);
      b.insertAdjacentHTML("beforeend",
        `<span class="char-info"><span class="char-name">${v.name}</span>
         <span class="char-role">${v.role} · ${ready?"120 天 · 专属结局":"即将开放"}</span></span>`);
      if(!ready){ b.disabled=true; b.style.opacity=".45"; }
      deck.appendChild(b);
      dots.appendChild(UI.el("i"));
      return b;
    });

    function layoutDeck(dy){
      dy=dy||0;
      cards.forEach((b,i)=>{
        const d=i-cur;
        let t,o,z;
        if(d<0){ // 已翻过的牌：向上飞走淡出
          t=`translateY(${-50-130+d*4}%) rotate(-4deg)`; o=0; z=0;
        }else{
          const peek=Math.min(d,3);
          const prog=Math.max(-1,Math.min(1,dy/160)); // 拖拽进度 -1..1
          const shift=peek*22 - prog*22;              // 拖动时后牌顶出
          const sc=1-peek*0.055 + prog*0.055;
          t=`translateY(calc(-50% + ${d===0?dy:(dy*0.25)-shift}px)) scale(${d===0?1:sc})`;
          o=peek>2?0:1; z=100-d;
        }
        b.style.transform=t;
        b.style.opacity=o;
        b.style.zIndex=z;
        b.classList.toggle("is-top", i===cur);
      });
      [...dots.children].forEach((dt,i)=>dt.classList.toggle("on",i===cur));
    }
    layoutDeck();

    function step(dir){
      const n=cur+dir;
      if(n<0||n>=cards.length) { layoutDeck(); return; }
      cur=n; layoutDeck();
    }

    function pickCurrent(){
      const k=keys[cur];
      if(typeof window[CONFIG.branches[k].data]!=="undefined") Engine.start(k);
    }
    document.getElementById("btn-pick").addEventListener("click",pickCurrent);

    /* 触摸 + 鼠标拖拽（上下） */
    function down(y){ dragY=y; dragMoved=0; deck.classList.add("grabbing"); }
    function move(y){
      if(dragY==null) return;
      const dy=y-dragY; dragMoved=Math.max(dragMoved,Math.abs(dy));
      layoutDeck(dy);
    }
    function up(y,ev){
      if(dragY==null) return;
      const dy=y-dragY; dragY=null; deck.classList.remove("grabbing");
      if(dragMoved<9){ // 视为点击
        layoutDeck();
        const t=ev&&ev.target&&ev.target.closest?ev.target.closest(".deck-card"):null;
        if(t){ const i=cards.indexOf(t); if(i===cur) pickCurrent(); else if(i>cur){cur=i;layoutDeck();} }
        return;
      }
      if(dy<-55) step(1); else if(dy>55) step(-1); else layoutDeck();
    }
    deck.addEventListener("touchstart",e=>{ down(e.touches[0].clientY); },{passive:true});
    deck.addEventListener("touchmove",e=>{ if(dragY!=null){ e.preventDefault(); move(e.touches[0].clientY); } },{passive:false});
    deck.addEventListener("touchend",e=>{ up(e.changedTouches[0].clientY,e.changedTouches[0]); });
    deck.addEventListener("touchcancel",()=>{ dragY=null; deck.classList.remove("grabbing"); layoutDeck(); });
    deck.addEventListener("mousedown",e=>{ e.preventDefault(); down(e.clientY); });
    window.addEventListener("mousemove",e=>move(e.clientY));
    window.addEventListener("mouseup",e=>up(e.clientY,e));
    /* 桌面滚轮 */
    let wheelLock=false;
    deck.addEventListener("wheel",e=>{
      e.preventDefault();
      if(wheelLock) return;
      if(Math.abs(e.deltaY)<18) return;
      wheelLock=true; setTimeout(()=>wheelLock=false,380);
      step(e.deltaY>0?1:-1);
    },{passive:false});

    const saved=localStorage.getItem(CONFIG.saveKey);
    if(saved){
      document.getElementById("btn-resume").style.display="block";
      try{
        const s=JSON.parse(saved);
        if(s && (s.stamps&&s.stamps.length || s.ended))
          document.getElementById("btn-stamps").style.display="block";
      }catch{}
    }
  },

  blankState(){
    return {job:null,skills:[],style:null,branch:null,events:[],idx:0,day:1,
            heresy:0,playerTags:{},playerDims:{},ended:null,_sideHist:[],stamps:[]};
  },

  /* ---------- 开局：数据从 window.EVENTS_X 读取，零网络 ---------- */
  start(branchKey){
    UI.go("s-loading");
    if(!this.state) this.state = this.blankState();
    this.state.branch = branchKey;
    try{
      const data = window[CONFIG.branches[branchKey].data];
      if(!Array.isArray(data) || !data.length) throw new Error("事件库未打包");
      this.validate(data, branchKey);
      // 时辰制：先按天，再按时辰顺序（子丑寅卯辰巳午未申酉戌亥）
      const SHICHEN="子丑寅卯辰巳午未申酉戌亥";
      this.state.events = [...data].sort((a,b)=>
        a.day-b.day ||
        SHICHEN.indexOf((a.shichen||"?")[0])-SHICHEN.indexOf((b.shichen||"?")[0]));
      this.save();
      this.renderEvent();
    }catch(e){
      alert("事件库载入出错："+e.message);
      UI.go("s-route");
    }
  },

  validate(events, branchKey){
    const ids=new Set(), checkpoints=new Set();
    for(const ev of events){
      if(!ev.id||!ev.scene||!Array.isArray(ev.options)||ev.options.length!==2)
        throw new Error("事件结构不完整: "+(ev.id||"未知"));
      if(ids.has(ev.id)) throw new Error("事件 id 重复: "+ev.id);
      ids.add(ev.id);
      const corr=ev.options.filter(o=>o.correct);
      if(ev.finale || ev.flavor){ // 终局/夜话：双正确，不判对错
        if(corr.length<1) throw new Error("终局/夜话事件至少1个正确选项: "+ev.id);
      }else if(corr.length!==1) throw new Error("每事件必须恰好1个正确选项: "+ev.id);
      if(ev.checkpoint) checkpoints.add(ev.checkpoint);
    }
    const dup=events.length-checkpoints.size;
    if(events.length>0 && dup/events.length>0.05)
      console.warn("⚠️ 考点重复率超 5%");
  },

  renderEvent(){
    const st=this.state;
    if(st.idx>=st.events.length || st.day>CONFIG.totalDays){
      return this.end(this.routeEnding());
    }
    const ev=st.events[st.idx];
    UI.go("s-play");
    document.getElementById("hud-day").textContent=`第 ${ev.day} 天 / ${CONFIG.totalDays}`;
    document.getElementById("hud-shichen").textContent=ev.shichen||"";
    document.getElementById("hud-heresy").textContent=st.heresy;
    // 进度条 = 当天时辰进度（辰→未→戌 逐格推进），天数显示整体进度
    const dayTotal=st.events.reduce((n,e)=>n+(e.day===ev.day?1:0),0);
    const dayPos=st.events.slice(0,st.idx+1).reduce((n,e)=>n+(e.day===ev.day?1:0),0);
    document.getElementById("hud-bar").style.width=(dayPos/dayTotal*100)+"%";
    document.getElementById("ev-stag").textContent=`${CONFIG.branches[st.branch].name} · 第 ${ev.stage||"-"} 阶段`;
    document.getElementById("ev-scene").textContent=ev.scene;
    document.getElementById("ev-feedback").innerHTML="";

    let correctFirst = Math.random()<0.5;
    const hist=st._sideHist;
    const last2=hist.slice(-2);
    if(last2.length===2 && last2[0]===last2[1]) correctFirst=!last2[0];
    hist.push(correctFirst);

    const opts=[...ev.options].sort((a,b)=>{
      const ac=a.correct?1:0, bc=b.correct?1:0;
      return correctFirst? bc-ac : ac-bc;
    });

    const box=document.getElementById("ev-opts");
    box.innerHTML="";
    opts.forEach(o=>{
      const b=UI.el("button","btn opt",o.text);
      b.addEventListener("click",()=>this.choose(ev,o,b,box));
      box.appendChild(b);
    });
    this.save();
  },

  choose(ev,opt,btn,box){
    const st=this.state;
    [...box.children].forEach(c=>c.disabled=true);
    btn.classList.add(opt.correct?"good":"bad");

    (opt.tags||[]).forEach(t=>{
      st.playerTags[t]=(st.playerTags[t]||0)+(opt.correct?2:1);
    });
    Object.entries(opt.dims||{}).forEach(([d,v])=>{
      if(CONFIG.dims.includes(d)) st.playerDims[d]=(st.playerDims[d]||0)+v;
    });

    if(!opt.correct){
      st.heresy++;
      document.getElementById("hud-heresy").textContent=st.heresy;
    }

    const fb=UI.el("div","feedback"+(opt.correct?"":" err"),
      (opt.correct?"✅ ":"❌ ")+opt.feedback+
      (opt.source?`<div class="src">${opt.source}</div>`:""));
    document.getElementById("ev-feedback").appendChild(fb);

    const next=UI.el("button","btn primary",
      (st.heresy>=CONFIG.heresyMax)?"……":"继续");
    next.style.marginTop="12px";
    next.addEventListener("click",()=>{
      st.idx++; st.day=ev.day;
      if(st.heresy>=CONFIG.heresyMax) return this.end("baolu");
      this.save();
      // 里程碑检测：非阻塞印章卡（越过节点当天即触发）
      const hit=MILESTONES.find(m=>ev.day>=m.day && !st.stamps.includes(m.day) && m.day> (st._lastMilestoneDay||0));
      if(hit){ st._lastMilestoneDay=hit.day; this.save(); this.showStamp(hit); return; }
      this.renderEvent();
    });
    document.getElementById("ev-feedback").appendChild(next);
    this.save();
  },

  routeEnding(){
    const st=this.state, d=st.playerDims;
    const g=k=>d[k]||0;
    if(st.branch==="C" && g("情缘")>=20 && g("才华")>=20) return "liangyuan"; // 彩蛋线
    if(g("自主")>=18 && g("才华")>=15 && g("情缘")<12) return "zizai";
    if(g("名声")>=18 && g("家世")<10) return "mingnv";
    if(g("家世")>=15 && g("自主")<10) return "jiangjiu";
    return "wuji";
  },

  /* 人格标签：维度前三组合 */
  persona(){
    const d=this.state.playerDims;
    const top=CONFIG.dims.map(k=>[k,d[k]||0]).sort((a,b)=>b[1]-a[1]).slice(0,3);
    return top.filter(x=>x[1]>0).map(x=>x[0]);
  },

  /* 出嫁类结局（良缘/将就）才配结局大图 */
  isMarryEnding(key){ return key==="liangyuan"||key==="jiangjiu"; },

  end(key){
    const st=this.state; st.ended=key; this.save();
    if(key==="liangyuan" && !st._actsDone){ st._actsDone=true; this.save(); return this.playActs(()=>this.end(key)); }
    const e=ENDINGS[key];
    UI.go("s-end");
    const art=document.getElementById("end-art");
    const portrait=document.getElementById("end-portrait");
    if(this.isMarryEnding(key)){
      // 出嫁结局：顶部大图（三幕揭晓后才会走到这里，不会提前剧透）
      portrait.style.display="none";
      art.style.display="block";
      art.onerror=function(){ art.style.display="none"; portrait.style.display="block"; };
      art.src="assets/end-"+st.branch+".jpg";
    }else{
      // 非出嫁结局：保持文字卡 + 小立绘
      art.onerror=null; art.style.display="none"; art.removeAttribute("src");
      portrait.style.display="block";
      portrait.src=CONFIG.branches[st.branch].char;
    }
    document.getElementById("end-stag").textContent="建中靖国元年 · 春";
    document.getElementById("end-title").textContent=e.title;
    document.getElementById("end-days").textContent=`议婚 ${st.day} 天 · 你的人生活法`;
    document.getElementById("end-rare").textContent=e.rare;
    const romance=(st.playerTags["感情"]||0)>=6;
    const hookText="「"+e.hook+(romance?ROMANCE_HOOK[key]:"")+"」";
    document.getElementById("end-hook").textContent=hookText;
    document.getElementById("end-source").textContent=e.source;
    document.getElementById("share-hint").textContent="";
    // 五维降级为一行小字汇总（雷达图已撤）
    const d=st.playerDims;
    document.getElementById("end-dims").textContent=
      CONFIG.dims.map(k=>k+" "+(d[k]||0)).join(" · ");
    const tl=document.getElementById("end-tags"); tl.innerHTML="";
    this.persona().forEach(p=>tl.appendChild(UI.el("span","",p)));
    // 词句回收图鉴（彩蛋线结局后展示）
    const gl=document.getElementById("end-gallery"); gl.innerHTML="";
    if(key==="liangyuan"){
      const ys=st.events.filter(ev=>ev.yishou && st.events.indexOf(ev)<st.idx+1);
      if(ys.length){
        gl.appendChild(UI.el("div","",'<b>📖 词句回收图鉴</b>——这些天你写下的句子：'));
        ys.forEach(ev=>gl.appendChild(UI.el("div","",`第${ev.day}天 · ${ev.shichen}：${ev.checkpoint}`)));
      }
    }
  },

  /* 三幕揭晓（彩蛋覆盖层） */
  playActs(done){
    const ACTS=[
      {title:"", lines:["却扇礼成。盖头落下的那一刻，","你忽然想起很多事——","","想起溪亭日暮，惊起的一滩鸥鹭。","想起雨后海棠，你说「应是绿肥红瘦」。","想起秋千架下，你倚门回首，把青梅嗅了又嗅。","","——原来那些句子，都是你写的。"]},
      {title:"", lines:["建中靖国元年，春。","","你叫李清照。","你嫁的人，叫赵明诚。"]},
      {title:"", lines:["后来每逢告假，他陪你逛相国寺，","质衣换来半千钱，买碑文，买果食。","后来你们赌书泼茶，笑得茶泼满怀。","","后来——","","此时距靖康之变，还有 26 年。"]}
    ];
    let i=0;
    const show=()=>{
      const body=document.getElementById("acts-body");
      body.innerHTML="";
      ACTS[i].lines.forEach((ln,idx)=>{
        const p=UI.el("p","",ln||"&nbsp;");
        p.style.cssText=`opacity:0;animation:unroll .6s ease ${idx*0.35}s forwards;text-align:center;margin:4px 0;line-height:2`;
        body.appendChild(p);
      });
      document.getElementById("btn-acts-next").textContent = i<ACTS.length-1?"……":"看结局";
    };
    UI.go("s-acts"); show();
    const btn=document.getElementById("btn-acts-next");
    const h=()=>{ i++; if(i<ACTS.length){show();}else{btn.removeEventListener("click",h); done();} };
    btn.addEventListener("click", h);
  },

  /* ---------- 分享：Canvas 2D 手绘结局卡（无第三方依赖，沙箱内最稳） ---------- */
  loadImage(src, timeout=3000, retries=2){
    const attempt=(n)=>new Promise((res,rej)=>{
      const img=new Image();
      const t=setTimeout(()=>rej(new Error("img timeout")),timeout);
      img.onload=()=>{clearTimeout(t);res(img);};
      img.onerror=()=>{clearTimeout(t);rej(new Error("img load fail"));};
      img.src=src+(n?`?r=${n}`:"");
    });
    let p=attempt(0);
    for(let i=1;i<=retries;i++) p=p.catch(()=>attempt(i));
    return p;
  },

  /* 分享结局卡：3:4 海报式——大图满版铺底 + 底部墨渐变压字（结局名+判词+落款）。
     出嫁结局用婚嫁图，非出嫁结局用立绘；五维雷达图已撤出分享卡。 */
  drawEndCard(endKey, portrait, art){
    const e=ENDINGS[endKey], st=this.state;
    const W=1080,H=1440,cv=document.createElement("canvas");
    cv.width=W; cv.height=H;
    const g=cv.getContext("2d");
    const C={paper:"#FAF8F5",ink:"#1A1A1A",charcoal:"#4A4540",faint:"#8A8478",gamboge:"#C9A84C"};
    const SERIF='"Noto Serif SC","Songti SC",serif';
    const romance=(st.playerTags["感情"]||0)>=6;
    const hook="「"+e.hook+(romance?ROMANCE_HOOK[endKey]:"")+"」";
    const img=art||portrait;
    g.textAlign="center";
    if(img){
      // 大图满版铺底（cover，顶部对齐保人物面部）
      const ir=img.width/img.height, tr=W/H;
      let sw,sh,sx,sy;
      if(ir>tr){ sh=img.height; sw=sh*tr; sx=(img.width-sw)/2; sy=0; }
      else{ sw=img.width; sh=sw/tr; sx=0; sy=0; }
      g.drawImage(img,sx,sy,sw,sh,0,0,W,H);
      // 底部墨渐变文字区
      const grad=g.createLinearGradient(0,H*0.40,0,H);
      grad.addColorStop(0,"rgba(20,16,12,0)");
      grad.addColorStop(0.55,"rgba(20,16,12,.72)");
      grad.addColorStop(1,"rgba(20,16,12,.92)");
      g.fillStyle=grad; g.fillRect(0,H*0.40,W,H*0.60);
      // 压字：时序 → 结局名 → 稀有度 → 判词 → 落款
      g.fillStyle=C.gamboge; g.font=`30px ${SERIF}`;
      g.fillText(`建中靖国元年 · 春 · 议婚 ${st.day} 天`,W/2,H-478);
      g.fillStyle=C.paper; g.font=`700 100px ${SERIF}`;
      g.fillText(e.title,W/2,H-356);
      g.fillStyle="rgba(250,248,245,.78)"; g.font=`28px ${SERIF}`;
      g.fillText(e.rare,W/2,H-300);
      g.fillStyle=C.paper; g.font=`42px ${SERIF}`;
      wrapText(g,hook,W/2,H-236,W-220,66);
      g.fillStyle="rgba(250,248,245,.6)"; g.font=`28px ${SERIF}`;
      g.fillText("我在宋朝会出嫁吗 · 5 种身份 × 5 个维度",W/2,H-64);
    }else{
      // 无图兜底：纸本文字卡（正常流程不会走到这里）
      g.fillStyle=C.paper; g.fillRect(0,0,W,H);
      g.strokeStyle=C.ink; g.lineWidth=5; g.strokeRect(44,44,W-88,H-88);
      g.strokeStyle=C.faint; g.lineWidth=2; g.strokeRect(58,58,W-116,H-116);
      g.fillStyle=C.faint; g.font=`38px ${SERIF}`;
      g.fillText("我在宋朝会出嫁吗",W/2,170);
      g.font="150px serif"; g.fillText(e.emoji,W/2,440);
      g.fillStyle=C.ink; g.font=`700 110px ${SERIF}`;
      g.fillText(e.title,W/2,630);
      g.fillStyle=C.charcoal; g.font=`40px ${SERIF}`;
      g.fillText(`议婚 ${st.day} 天`,W/2,706);
      g.fillStyle=C.faint; g.font=`28px ${SERIF}`;
      g.fillText(e.rare,W/2,758);
      g.fillStyle=C.charcoal; g.font=`46px ${SERIF}`;
      wrapText(g,hook,W/2,880,W-260,76);
      g.fillStyle=C.faint; g.font=`30px ${SERIF}`;
      g.fillText("5 种身份 × 5 个维度，你是哪一种人生",W/2,H-110);
    }
    return cv;

    function wrapText(g,text,x,y,maxW,lh){
      let line="",yy=y;
      for(const ch of text){
        if(g.measureText(line+ch).width>maxW){ g.fillText(line,x,yy); line=ch; yy+=lh; }
        else line+=ch;
      }
      if(line) g.fillText(line,x,yy);
      return yy;
    }
  },


  async share(){
    const miniTool = window.xhs && window.xhs.miniTool;
    const hint = document.getElementById("share-hint");
    hint.textContent="正在生成结局卡……";
    try{
      const endKey=this.state.ended||"wuji";
      const portrait = await this.loadImage("assets/char-"+this.state.branch+".jpg").catch(()=>null);
      // 出嫁类结局才带结局大图（同域资源，Canvas 导出无跨域问题）
      const art = this.isMarryEnding(endKey)
        ? await this.loadImage("assets/end-"+this.state.branch+".jpg").catch(()=>null) : null;
      const cv = this.drawEndCard(endKey, portrait, art);
      const dataUrl = cv.toDataURL("image/png");
      if(miniTool){
        // 大图先落临时文件，再唤起发布页（文档 §3.5 推荐路径）
        const { filePath } = await miniTool.writeTempFile({ data: dataUrl });
        await miniTool.postNote({
          title: NOTE_PRESET.title,
          content: NOTE_PRESET.content,
          tags: NOTE_PRESET.tags,
          mediaInfo: { image_resources: [{ url: filePath }] }
        });
        hint.textContent="已带入发布页，加两句你的感想再发，数据会更好";
      }else{
        // 浏览器/无 SDK 环境降级：直接保存
        const a=document.createElement("a");
        a.download="我在宋朝会出嫁吗-结局卡.png";
        a.href=dataUrl;
        document.body.appendChild(a);
        a.click();
        a.remove();
        hint.textContent="结局卡已生成（预览环境，小工具内将直接唤起发笔记）";
      }
    }catch(err){
      hint.textContent="生成失败，请再试一次";
      console.warn(err && err.errMsg || err);
    }
  },

  /* ---------- 里程碑印章卡 ---------- */
  showStamp(m){
    const st=this.state;
    if(!st.stamps.includes(m.day)) st.stamps.push(m.day);
    this.save();
    document.getElementById("stamp-char").src=CONFIG.branches[st.branch].char;
    document.getElementById("stamp-seal").textContent=m.title;
    document.getElementById("stamp-title").textContent=m.emoji+" "+m.title;
    document.getElementById("stamp-days").textContent=`议婚季 · 第 ${m.day} 天`;
    document.getElementById("stamp-hook").textContent="「"+m.hook+"」";
    document.getElementById("stamp-rare").textContent=m.rare;
    document.getElementById("stamp-hint").textContent="";
    this._currentStamp=m;
    UI.go("s-stamp");
  },

  /* 里程碑印章卡：立绘大图为视觉主体（约 60% 高度，顶部对齐），印章角标 + 天数压图 */
  drawStampCard(m, portrait){
    const st=this.state;
    const W=900,H=1200,cv=document.createElement("canvas");
    cv.width=W; cv.height=H;
    const g=cv.getContext("2d");
    const C={paper:"#FAF8F5",ink:"#1A1A1A",charcoal:"#4A4540",faint:"#8A8478",cinnabar:"#B5544A",gamboge:"#C9A84C"};
    const SERIF='"Noto Serif SC","Songti SC",serif';
    g.fillStyle=C.paper; g.fillRect(0,0,W,H);
    g.strokeStyle=C.ink; g.lineWidth=4; g.strokeRect(36,36,W-72,H-72);
    g.strokeStyle=C.faint; g.lineWidth=1.5; g.strokeRect(48,48,W-96,H-96);
    g.textAlign="center";
    g.fillStyle=C.faint; g.font=`30px ${SERIF}`;
    g.fillText("我 在 宋 朝 会 出 嫁 吗",W/2,120);
    // 立绘大图区
    const ax=80, ay=150, aw=W-160, ah=690;
    g.save();
    g.beginPath(); g.roundRect(ax,ay,aw,ah,18); g.clip();
    if(portrait){
      const ir=portrait.width/portrait.height, tr=aw/ah;
      let sw,sh,sx,sy;
      if(ir>tr){ sh=portrait.height; sw=sh*tr; sx=(portrait.width-sw)/2; sy=0; }
      else{ sw=portrait.width; sh=sw/tr; sx=0; sy=0; }
      g.drawImage(portrait,sx,sy,sw,sh,ax,ay,aw,ah);
    }else{
      g.fillStyle="#E8E4DC"; g.fillRect(ax,ay,aw,ah);
      g.fillStyle=C.faint; g.font="120px serif";
      g.fillText(m.emoji,W/2,ay+ah/2);
    }
    // 底部渐变垫底 + 天数压图
    const grad=g.createLinearGradient(0,ay+ah-150,0,ay+ah);
    grad.addColorStop(0,"rgba(250,248,245,0)"); grad.addColorStop(1,"rgba(250,248,245,.95)");
    g.fillStyle=grad; g.fillRect(ax,ay+ah-150,aw,150);
    g.fillStyle=C.gamboge; g.font=`34px ${SERIF}`;
    g.fillText(`议婚季 · 第 ${m.day} 天`,W/2,ay+ah-28);
    g.restore();
    g.strokeStyle=C.wash; g.lineWidth=2;
    g.beginPath(); g.roundRect(ax,ay,aw,ah,18); g.stroke();
    // 朱砂印章角标（右上，竖排）
    g.save(); g.translate(ax+aw-88,ay+118); g.rotate(0.06);
    g.fillStyle=C.cinnabar; g.globalAlpha=.92;
    g.beginPath(); g.roundRect(-62,-96,124,192,12); g.fill();
    g.globalAlpha=1; g.fillStyle=C.paper; g.font=`52px ${SERIF}`;
    const t=m.title;
    if(t.length<=3){ [...t].forEach((ch,i)=>g.fillText(ch,0,-44+i*64)); }
    else{ g.fillText(t.slice(0,2),0,-30); g.fillText(t.slice(2,4),0,42); }
    g.restore();
    // 下方文案
    g.font="46px serif"; g.fillText(m.emoji,W/2,900);
    g.fillStyle=C.ink; g.font=`42px ${SERIF}`;
    g.fillText(m.title,W/2,956);
    g.fillStyle=C.charcoal; g.font=`29px ${SERIF}`;
    // 钩子换行
    const hook="「"+m.hook+"」"; let line="",yy=1004;
    for(const ch of hook){
      if(g.measureText(line+ch).width>W-200){ g.fillText(line,W/2,yy); line=ch; yy+=44; }
      else line+=ch;
    }
    if(line) g.fillText(line,W/2,yy);
    g.fillStyle=C.faint; g.font=`23px ${SERIF}`;
    g.fillText(m.rare,W/2,yy+44);
    g.fillText("5 种身份 × 5 个维度 · 你会活成谁",W/2,H-84);
    return cv;
  },

  async shareStamp(){
    const m=this._currentStamp; if(!m) return;
    const miniTool = window.xhs && window.xhs.miniTool;
    const hint=document.getElementById("stamp-hint");
    hint.textContent="正在盖章……";
    try{
      const portrait = await this.loadImage("assets/char-"+this.state.branch+".jpg").catch(()=>null);
      const dataUrl=this.drawStampCard(m,portrait).toDataURL("image/png");
      if(miniTool){
        const { filePath } = await miniTool.writeTempFile({ data: dataUrl });
        await miniTool.postNote({
          title:`议婚第${m.day}天｜${m.title}`,
          content:`穿越回1100年汴京议婚季的第 ${m.day} 天，我拿到了「${m.title}」。${m.hook} 你会怎么选？`,
          tags:NOTE_PRESET.tags,
          mediaInfo:{ image_resources:[{url:filePath}] }
        });
        hint.textContent="已带入发布页";
      }else{
        const a=document.createElement("a");
        a.download=`议婚-第${m.day}天.png`; a.href=dataUrl;
        document.body.appendChild(a); a.click(); a.remove();
        hint.textContent="印章卡已生成（预览环境，小工具内将直接唤起发笔记）";
      }
    }catch(err){
      hint.textContent="生成失败，请再试一次";
      console.warn(err && err.errMsg || err);
    }
  },

  renderStamps(){
    const st=this.state;
    const list=document.getElementById("stamps-list"); list.innerHTML="";
    const got=(st&&st.stamps)||[];
    document.getElementById("stamps-count").textContent=got.length+"/"+(MILESTONES.length+1);
    MILESTONES.forEach(m=>{
      const has=got.includes(m.day);
      const b=UI.el("button","btn",
        `${has?m.emoji:"🔒"} ${m.title} · 第${m.day}天`+
        (has?` <small style="color:var(--stoneblue)">点我分享</small>`:`<small style="color:var(--faint)">未达成</small>`));
      if(has) b.addEventListener("click",()=>this.showStamp(m));
      else { b.disabled=true; b.style.opacity=".45"; }
      list.appendChild(b);
    });
    if(st&&st.ended){
      const e=ENDINGS[st.ended];
      const b=UI.el("button","btn",`${e.emoji} 结局「${e.title}」 <small style="color:var(--stoneblue)">点我分享</small>`);
      b.addEventListener("click",()=>{ UI.go("s-end"); });
      list.appendChild(b);
    }
    UI.go("s-stamps");
  },

  save(){ if(this.state) localStorage.setItem(CONFIG.saveKey, JSON.stringify(this.state)); },
  resume(){
    try{
      this.state=JSON.parse(localStorage.getItem(CONFIG.saveKey));
      if(!this.state||!this.state.events||!this.state.events.length) throw 0;
      if(!this.state._sideHist) this.state._sideHist=[];
      if(!this.state.stamps) this.state.stamps=[];
      if(this.state.ended){ this.end(this.state.ended); return; }
      this.renderEvent();
    }catch{ localStorage.removeItem(CONFIG.saveKey); location.reload(); }
  },
  reset(){ localStorage.removeItem(CONFIG.saveKey); location.reload(); }
};

Engine.init();
