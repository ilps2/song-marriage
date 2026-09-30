/* ============================================================
   我在宋朝会出嫁吗 v1 · 小红书小工具版引擎（姊妹篇，维度结算版）
   适配规则（fe 小工具开发者文档）：
   - 纯离线：事件数据经 <script src> 注入 window.EVENTS_X，禁止 fetch
   - 无内联脚本/行内事件：全部 addEventListener
   - 分享：xhs.miniTool.writeTempFile + postNote；浏览器预览降级为下载
   ============================================================ */

/* 全局错误兜底：资源或脚本异常时给出可读提示（封面页也要显示，避免"点了没反应"无迹可查） */
window.addEventListener("error",function(e){
  var msg="载入出错："+(e.message||(e.target&&e.target.src)||"资源加载失败");
  var cover=document.querySelector("#s-cover.active");
  if(cover){
    var ce=document.getElementById("cover-err");
    if(ce){ce.style.display="block";ce.textContent=msg+"（请截屏反馈）";}
    return;
  }
  var p=document.getElementById("load-err");
  if(p) p.textContent=msg;
  var ld=document.getElementById("s-loading");
  if(ld) ld.classList.add("active");
},true);

/* 本地存储防护：个别容器 localStorage 会抛异常，全程走安全包装 */
const Store={
  get(k){try{return localStorage.getItem(k)}catch(e){return null}},
  set(k,v){try{localStorage.setItem(k,v)}catch(e){}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}
};

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
    B:{name:"🏮 樊楼乐伎", data:"EVENTS_B", char:"assets/char-B.jpg", role:"才名满汴京"},
    C:{name:"📚 官宦才女", data:"EVENTS_C", char:"assets/char-C.jpg", role:"词名动京师"},
    D:{name:"🍵 茶坊掌柜", data:"EVENTS_D", char:"assets/char-D.jpg", role:"自己能挣钱"},
    E:{name:"🌾 乡间孤女", data:"EVENTS_E", char:"assets/char-E.jpg", role:"全靠自己"},
    F:{name:"💐 进士家小娘子", data:"EVENTS_F", char:"assets/char-F.jpg", role:"榜下捉婿 · 婚后相知", days:60, casual:true},
    G:{name:"🍂 自立娘子", data:"EVENTS_G", char:"assets/char-G.jpg", role:"亲事自己做主 · 金石自立", days:60, casual:true}
  },
  dims: ["才华","名声","家世","情缘","自主"],
  totalDays: 120,
  heresyMax: 3,
  saveKey: "jgcqm_save_v1",
  slotKey: "jgcqm_slot_v1"
};

/* rare 为静态稀有度描述（离线环境无计数后端，按预设写死） */
const ENDINGS = {
  liangyuan: {emoji:"🌸", title:"良缘 · 千古知音", rare:"不足 5% 的玩家走到了这里",
    hook:"1101 年，汴京最聪明的女子出嫁了。",
    source:"建中靖国元年，李清照嫁赵明诚——《金石录后序》。"},
  zizai:    {emoji:"🕊️", title:"自在", rare:"敢不嫁的人不多",
    hook:"恭喜，你没有嫁出去。但你活成了另一个版本的李清照。",
    source:"宋代女子嫁资为私产，不嫁亦可自立——司马光《书仪》。"},
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

/* 五线专属结局文案：只覆盖 title / hook，emoji/rare/source 沿用通用表兜底 */
const BRANCH_ENDINGS = {
  /* A 商户之女：彩帛铺账房 · 孙公子 · 蓝布账簿/心意账/乌木算盘 · 岁时行 · 灯笼「八月十六」 */
  A:{
    liangyuan:{title:"良缘 · 账里有你", hook:"八月十六的灯笼下，他把心意账翻到了最后一页。"},
    zizai:   {title:"自在 · 自己当户", hook:"岁时行的账我自己记，我的日子也是。"},
    jiangjiu:{title:"将就 · 合账过日子", hook:"嫁衣是铺里最好的彩帛，账却不是我想记的那本。"},
    mingnv:  {title:"名女子 · 汴京第一账", hook:"全汴京的商铺都来请她看账，媒人倒不敢上门了。"},
    wuji:    {title:"无疾 · 八月十六未至", hook:"灯笼年年挂，提灯的人没有来。"},
    baolu:   {title:"失名 · 烂账一笔", hook:"谣言比流水账记得快，彩帛铺的名声一夜褪了色。"}
  },
  /* B 樊楼乐伎：琵琶自赎 · 填词书生 · 旧帕/《往来集》/琵琶 · 弦正馆 ·《满州桥雪》· 州桥年约 */
  B:{
    liangyuan:{title:"良缘 · 词外知音", hook:"他的词填到第三阕，我的琵琶先懂了。"},
    zizai:   {title:"自在 · 弦正馆主", hook:"弦正馆的灯，比花轿亮。"},
    jiangjiu:{title:"将就 · 嫁作商人妇", hook:"脱籍的钱凑够了，赎不回州桥那场雪。"},
    mingnv:  {title:"名女子 · 一曲满州桥雪", hook:"满城都唱《满州桥雪》，没人敢问她的婚事。"},
    wuji:    {title:"无疾 · 年约空候", hook:"州桥年约，他来了一阕词，没有来一个人。"},
    baolu:   {title:"失名 · 弦断", hook:"樊楼的嘴比琵琶快，一夜之间，没人再点她的曲。"}
  },
  /* C 官宦才女（李清照彩蛋）：金石 · 词 · 秋千架 */
  C:{
    liangyuan:{title:"良缘 · 千古知音", hook:"1101 年，汴京最聪明的女子出嫁了。"},
    zizai:   {title:"自在 · 词自立身", hook:"不嫁。词比婚事长。"},
    jiangjiu:{title:"将就 · 倚门另嫁", hook:"嫁了旁人。秋千架下那一眼，留在了词里。"},
    mingnv:  {title:"名女子 · 词动京师", hook:"全汴京都读过她的词，没人敢娶她。"},
    wuji:    {title:"无疾 · 秋千架空", hook:"秋千架空了三年，等的人没来。"},
    baolu:   {title:"失名 · 闺誉尽毁", hook:"一句闲话，碎了她的闺誉，像失手跌裂的碑。"}
  },
  /* D 茶坊掌柜之女：点茶雅集 · 刻书匠之子 · 越窑青瓷盏/《青峰集》· 青峰书茶坊 · 茶烟能立骨 */
  D:{
    liangyuan:{title:"良缘 · 一盏知音", hook:"他刻完《青峰集》最后一页，来喝我点的第一盏茶。"},
    zizai:   {title:"自在 · 茶烟立骨", hook:"青峰书茶坊的茶烟，能把一个女子的骨头立直。"},
    jiangjiu:{title:"将就 · 另配他人", hook:"嫁了。越窑盏还温着，点茶的人换了。"},
    mingnv:  {title:"名女子 · 点茶第一", hook:"汴京雅集以请到她点茶为荣，议亲却都绕着她走。"},
    wuji:    {title:"无疾 · 茶凉", hook:"茶点了一盏又一盏，刻书铺的门没有为她开。"},
    baolu:   {title:"失名 · 盏碎", hook:"青瓷盏碎了一只，名声碎了一地，拾不起来。"}
  },
  /* E 乡间孤女：三贯钱闯汴京 · 脚店厨子七郎 · 木梳/木勺 · 州桥汤记 · 提灯的人 */
  E:{
    liangyuan:{title:"良缘 · 汤记团圆", hook:"州桥汤记的灯亮了，提灯的是她，旁边站着七郎。"},
    zizai:   {title:"自在 · 三贯自立", hook:"三贯钱闯出来的路，不必走进谁家的花轿。"},
    jiangjiu:{title:"将就 · 木梳别嫁", hook:"嫁了。木梳收进箱底，木勺还握在手里。"},
    mingnv:  {title:"名女子 · 汤记老板娘", hook:"州桥汤记一夜成名，提灯的她比灯还亮。"},
    wuji:    {title:"无疾 · 灯未提来", hook:"说好提灯来的人，被生活绊在了路上。"},
    baolu:   {title:"失名 · 汤冷", hook:"一句闲话传过州桥，汤记的热气散得比谁都快。"}
  },
  /* F 新科进士家的小娘子：榜下捉婿 · 六礼 · 婚后相知 · 唱和集/雨夜伞/红纸榜文（剧情专线，无风评出局） */
  F:{
    liangyuan:{title:"良缘 · 榜下良缘", hook:"捉婿那日爹替你看的人，比你想象的好。"},
    zizai:   {title:"自在 · 榜上别路", hook:"你可以不嫁——榜下又不是只有一条路。"},
    jiangjiu:{title:"将就 · 六礼俱足", hook:"六礼一样不少，只是唱和的下半阕，不是他。"},
    mingnv:  {title:"名女子 · 词名满汴京", hook:"汴京传抄你的词，说亲的人反倒绕开了门。"},
    wuji:    {title:"无疾 · 又开一科", hook:"新一科放榜了，茶棚里看榜的位子空着。"},
    baolu:   {title:"失名 · 闲言碎语", hook:"汴京的嘴，比放榜的鼓声还快。"}
  },
  /* G 自立娘子：嫁资单子 · 退亲书 · 金石录 · 自己做主自己嫁（剧情专线，无风评出局） */
  G:{
    liangyuan:{title:"良缘 · 自择良缘", hook:"这一回嫁，嫁的是自己挑的。"},
    zizai:   {title:"自在 · 嫁资自立", hook:"嫁资是你的，日子也是你的。"},
    jiangjiu:{title:"将就 · 又是别人挑", hook:"到头来，嫁的还是「该嫁了」三个字。"},
    mingnv:  {title:"名女子 · 金石名", hook:"全汴京都知道有个校金石的娘子，议婚的人绕着她走。"},
    wuji:    {title:"无疾 · 书到人不来", hook:"门房的书还在送，送书的人没再来。"},
    baolu:   {title:"失名 · 众口铄金", hook:"退亲是自己做的主，闲话也是真的——汴京只肯信后者。"}
  }
};

/* 按线取结局文案：该线有专属 title/hook 则覆盖，其余字段兜底到通用表 */
function endText(key, branch){
  const base=ENDINGS[key]||{};
  const b=(BRANCH_ENDINGS[branch]&&BRANCH_ENDINGS[branch][key])||{};
  return Object.assign({}, base, b);
}

const NOTE_PRESET = {
  title: "我在宋朝会出嫁吗",
  content: "穿越回1101年的汴京议婚季，我的宋朝人生结局是……7种身份5个维度，测测你会活成谁？",
  // 话题锚点语法：#话题名[话题]# 才会被发布页解析成可点击的真实话题
  tags: "#国风vibecoding[话题]# #小红书vibecoding大赛[话题]# #vibegame[话题]# #小红书小工具[话题]# #宋朝[话题]# #互动游戏[话题]#"
};

/* 分享弹层（宋系列同款）：生成卡片 → 预览 → 保存相册 / 发笔记 */
const ShareBox = {
  open(dataUrl, note){
    this._dataUrl = dataUrl;
    this._note = note;
    document.getElementById("ov-card").src = dataUrl;
    document.getElementById("ov-hint").textContent = "";
    document.getElementById("share-overlay").classList.remove("hidden");
  },
  close(){ document.getElementById("share-overlay").classList.add("hidden"); },
  bind(){
    document.getElementById("btn-ov-close").addEventListener("click", ()=>ShareBox.close());
    document.getElementById("btn-ov-save").addEventListener("click", ()=>ShareBox.save());
    document.getElementById("btn-ov-post").addEventListener("click", ()=>ShareBox.post());
  },
  async save(){
    const hint=document.getElementById("ov-hint");
    const miniTool = window.xhs && window.xhs.miniTool;
    if(!this._dataUrl) return;
    if(!miniTool){ hint.textContent="当前环境不支持直接保存，请截屏保存 📸"; return; }
    hint.textContent="保存中……";
    try{
      const { filePath } = await miniTool.writeTempFile({ data: this._dataUrl });
      await miniTool.saveImageToPhotosAlbum({ filePath });
      hint.textContent="已存入相册 ✅";
    }catch(err){ hint.textContent="保存失败，可直接截屏 📸"; }
  },
  post(){
    const hint=document.getElementById("ov-hint");
    const miniTool = window.xhs && window.xhs.miniTool;
    if(!this._dataUrl) return;
    if(!miniTool){ hint.textContent="当前环境不支持发笔记，请保存后手动发布"; return; }
    // 手势链内同步调 postNote——filePath 已在 end() 预写缓存，不 await 任何前置
    const cachedPath = (Engine._shareCache && Engine._shareCache.filePath) || null;
    const note = this._note;
    const doPost = (filePath)=>{
      Promise.resolve(miniTool.postNote({
        title: note.title,
        content: note.content,
        tags: note.tags,
        mediaInfo: { image_resources: [{ url: filePath }] }
      })).then(()=>{ hint.textContent="已带入发布页 ✅"; })
        .catch(()=>{ hint.textContent="唤起失败，可保存后手动发布"; });
    };
    if(cachedPath){ doPost(cachedPath); return; }
    hint.textContent="唤起发布页……";
    miniTool.writeTempFile({ data: this._dataUrl })
      .then(({filePath})=>doPost(filePath))
      .catch(()=>{ hint.textContent="唤起失败，可保存后手动发布"; });
  }
};

/* 里程碑：非阻塞分享卡（doc 要求端能力必须用户手势触发，故做成印章落下+主动分享） */
const MILESTONES = [
  {day:10,  emoji:"🌸", title:"笄礼",     hook:"母亲为我绾起长发。从今天起，说亲的人要踏破门槛了。", rare:"议婚季正式开始"},
  {day:40,  emoji:"🏮", title:"见过世面", hook:"相看过了、推辞过了、也心动过了。媒人的套路，我熟了。", rare:"一半的人在这里就草草嫁了"},
  {day:90,  emoji:"📜", title:"待嫁",     hook:"婚期将近。嫁妆单子我亲自过目——那是我的底气，谁也别想动。", rare:"坚持到这里的人，都为自己争过"}
];

/* 感情线走到深处时，结局卡钩子追加专属一句 */
const ROMANCE_HOOK = {
  liangyuan:" 赌书泼茶二十六年，值得。",
  zizai:" 青梅那一眼，我不后悔。",
  jiangjiu:" 心里那个人，就让他住在词里吧。",
  mingnv:" 他托人捎来一句：你的词，我都读了。",
  wuji:" 等的或许不是谁，是自己做主的机会。",
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
    document.getElementById("btn-load").addEventListener("click", ()=>Engine.loadSlot());
    document.getElementById("btn-share").addEventListener("click", ()=>Engine.share());
    document.getElementById("btn-card").addEventListener("click", ()=>Engine.previewCard());
    ShareBox.bind();
    document.getElementById("btn-replay").addEventListener("click", ()=>Engine.backToCover());
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
    let cur=0, dragY=null, dragMoved=0, dragStartX=0;
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
         <span class="char-role">${v.role} · ${ready?(v.days||CONFIG.totalDays)+" 天 · 专属结局":"即将开放"}</span></span>`);
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

    /* 触摸 / 鼠标拖拽（上下左右都能翻牌）
       v1.4.5 修复。原实现的三个脆弱点：
         ① touchcancel（手势被系统接管或回弹）时整次滑动被丢弃 → 表现为「滑不动」；
         ② 只按「终点位移」判定，手指滑出去又带回来就不算数；
         ③ 没有兜底入口 —— 手势一失效就够不到后面的身份线。
       修复：① 改按「拖动峰值」判定，被取消也兑现；② 支持左右滑动；
             ③ 多指干扰防护；④ ▲▼ 按钮 + 键盘方向键兜底（不依赖任何手势）。
       主路径仍是 TouchEvent —— 不改动大多数机型正在正常工作的路径。 */
    let dragLastY=null, dragMaxY=0, dragMinY=0, dragMaxX=0, dragMinX=0;

    function down(x,y){
      dragY=y; dragLastY=y; dragMoved=0;
      dragMaxY=0; dragMinY=0; dragMaxX=0; dragMinX=0;
      deck.classList.add("grabbing");
    }
    function move(x,y){
      if(dragY==null) return;
      const dy=y-dragY, dx=x-dragStartX;
      dragMoved=Math.max(dragMoved, Math.abs(dy), Math.abs(dx));
      dragMaxY=Math.max(dragMaxY,dy); dragMinY=Math.min(dragMinY,dy);
      dragMaxX=Math.max(dragMaxX,dx); dragMinX=Math.min(dragMinX,dx);
      dragLastY=y;
      layoutDeck(dy);
    }
    function finish(y, target){
      if(dragY==null) return;
      const endY=(typeof y==="number" && !isNaN(y))?y:dragLastY;
      const dy=(endY==null?0:endY-dragY);
      const downPk=Math.max(dragMaxY,dy), upPk=Math.min(dragMinY,dy);
      const leftPk=dragMinX, rightPk=dragMaxX;
      dragY=null; dragLastY=null;
      deck.classList.remove("grabbing");
      if(dragMoved<9){                                   // 视为点击
        layoutDeck();
        if(target&&target.closest){
          const t=target.closest(".deck-card");
          if(t){ const i=cards.indexOf(t);
            if(i===cur) pickCurrent(); else if(i>cur){ cur=i; layoutDeck(); } }
        }
        return;
      }
      /* 用峰值（而非终点）判定：手势被中途取消也不会白滑 */
      const TH=40;
      if(upPk<=-TH || leftPk<=-TH) step(1);
      else if(downPk>=TH || rightPk>=TH) step(-1);
      else layoutDeck();
    }

    let tid=null, lastX=null, lastY=null;
    const pickT=function(list,id){
      if(!list||!list.length) return null;
      for(let i=0;i<list.length;i++) if(list[i].identifier===id) return list[i];
      return list[0];
    };
    deck.addEventListener("touchstart", e=>{
      if(dragY!=null) return;                          // 已在拖动，忽略第二根手指
      const t=e.changedTouches[0]; if(!t) return;
      /* iOS 关键：touchstart 上 preventDefault，
         阻止 WKWebView 自身 UIScrollView 的回弹（bounce）抢走手势 ——
         touch-action:none 管不到盒树之外的 scrollView，iOS 上一拖就发 touchcancel。 */
      if(e.cancelable) e.preventDefault();
      tid=t.identifier; lastX=t.clientX; lastY=t.clientY; dragStartX=t.clientX;
      down(t.clientX,t.clientY);
    },{passive:false});
    deck.addEventListener("touchmove", e=>{
      if(dragY==null) return;
      const t=pickT(e.touches,tid); if(!t) return;
      lastX=t.clientX; lastY=t.clientY;
      if(e.cancelable) e.preventDefault();
      move(t.clientX,t.clientY);
    },{passive:false});
    deck.addEventListener("touchend", e=>{
      const t=pickT(e.changedTouches,tid);
      const ty=(t?t.clientY:lastY);
      tid=null; finish(ty, t?t.target:null);
    });
    deck.addEventListener("touchcancel", e=>{
      /* 手势被系统吃掉时仍兑现已滑出的距离 —— 「滑不动」的主因 */
      const t=pickT(e.changedTouches||[],tid);
      const ty=(t?t.clientY:lastY);
      tid=null; finish(ty, null);
    });
    deck.addEventListener("mousedown",e=>{ e.preventDefault(); dragStartX=e.clientX; down(e.clientX,e.clientY); });
    window.addEventListener("mousemove",e=>move(e.clientX,e.clientY));
    window.addEventListener("mouseup",e=>finish(e.clientY,e.target));

    /* 兜底入口：按钮 + 键盘方向键（完全不依赖手势） */
    const prevBtn=document.getElementById("deck-prev"), nextBtn=document.getElementById("deck-next");
    if(prevBtn) prevBtn.addEventListener("click",()=>step(-1));
    if(nextBtn) nextBtn.addEventListener("click",()=>step(1));
    deck.addEventListener("keydown",e=>{
      if(e.key==="ArrowUp"){ e.preventDefault(); step(-1); }
      else if(e.key==="ArrowDown"){ e.preventDefault(); step(1); }
      else if(e.key==="Enter"||e.key===" "){ e.preventDefault(); pickCurrent(); }
    });

    /* 桌面滚轮 */
    let wheelLock=false;
    deck.addEventListener("wheel",e=>{
      e.preventDefault();
      if(wheelLock) return;
      if(Math.abs(e.deltaY)<18) return;
      wheelLock=true; setTimeout(()=>wheelLock=false,380);
      step(e.deltaY>0?1:-1);
    },{passive:false});

    const saved=Store.get(CONFIG.saveKey);
    if(saved){
      document.getElementById("btn-resume").style.display="block";
      try{
        const s=JSON.parse(saved);
        if(s && (s.stamps&&s.stamps.length || s.ended))
          document.getElementById("btn-stamps").style.display="block";
      }catch{}
    }
    this.refreshSlotBtn();
  },

  /* ---------- 读档槽：失败重开不丢进度 ----------
     slot 只存轻量快照（不含几百 KB 的事件数组），读档时按 branch 重建 events */
  slotSnapshot(){
    const st=this.state;
    if(!st || !st.branch || !st.events || !st.events.length || st.ended) return null;
    const c=Object.assign({}, st);
    delete c.events;               // 事件库按分支可重建，不落盘
    return c;
  },
  saveSlot(){
    const snap=this.slotSnapshot();
    if(snap) Store.set(CONFIG.slotKey, JSON.stringify(snap));
  },
  readSlot(){
    try{
      const s=JSON.parse(Store.get(CONFIG.slotKey));
      return (s && s.branch && typeof s.idx==="number") ? s : null;
    }catch{ return null; }
  },
  loadSlot(){
    const snap=this.readSlot();
    if(!snap) return;
    UI.go("s-loading");
    try{
      const data = window[CONFIG.branches[snap.branch].data];
      if(!Array.isArray(data) || !data.length) throw new Error("事件库未打包");
      // 与 start() 相同的排序，保证 idx 对得上
      const SHICHEN="子丑寅卯辰巳午未申酉戌亥";
      const events=[...data].sort((a,b)=>
        a.day-b.day ||
        SHICHEN.indexOf((a.shichen||"?")[0])-SHICHEN.indexOf((b.shichen||"?")[0]));
      this.state=snap;
      this.state.events=events;
      if(!this.state._sideHist) this.state._sideHist=[];
      if(!this.state.stamps) this.state.stamps=[];
      // 快照定格在"出错那道题之前"：渲染当前事件重新作答
      this.save();
      this.renderEvent();
    }catch(e){
      alert("读档出错："+e.message);
      UI.go("s-cover");
    }
  },
  /* 封面「读档」按钮：有可用档才显示，并标注身份线与天数 */
  refreshSlotBtn(){
    const btn=document.getElementById("btn-load");
    if(!btn) return;
    const snap=this.readSlot();
    if(snap){
      const b=CONFIG.branches[snap.branch]||{};
      btn.style.display="block";
      btn.innerHTML=`🌸 换个人生 · ${b.name||snap.branch} · 从第 ${snap.day||1} 天重来`;
    }else{
      btn.style.display="none";
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

  /* 单线天数：F/G 古偶专线 60 天，老线 120 天 */
  lineDays(){ const st=this.state; return (st&&st.branch&&CONFIG.branches[st.branch].days)||CONFIG.totalDays; },
  /* 古偶专线（casual）：纯剧情体验，答错不累计风评、不会提前出局 */
  isCasual(){ const st=this.state; return !!(st&&st.branch&&CONFIG.branches[st.branch].casual); },

  renderEvent(){
    const st=this.state;
    if(st.idx>=st.events.length || st.day>this.lineDays()){
      return this.end(this.routeEnding());
    }
    const ev=st.events[st.idx];
    UI.go("s-play");
    document.getElementById("hud-day").textContent=`第 ${ev.day} 天 / ${this.lineDays()}`;
    document.getElementById("hud-shichen").textContent=ev.shichen||"";
    const hw=document.getElementById("hud-heresy-wrap");
    if(this.isCasual()){ hw.innerHTML="🌸 古偶专线 · 剧情畅玩"; }
    else{ hw.innerHTML=`风评 <b id="hud-heresy">${st.heresy}</b>/${CONFIG.heresyMax}`; }
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
    this.saveSlot();   // 每题渲染前写轻量快照：读档=回到本题重新作答
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

    if(!opt.correct && !this.isCasual()){
      st.heresy++;
      const hh=document.getElementById("hud-heresy"); if(hh) hh.textContent=st.heresy;
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
    if(st.branch==="F" && g("情缘")>=22 && g("自主")>=8) return "liangyuan"; // 甜向：婚后相知修成
    if(st.branch==="G" && g("情缘")>=18 && g("自主")>=18) return "liangyuan"; // 爽向：自己挑的良人
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
    // 非「失名」的正常结局：该局走完了，清掉读档快照避免封面误导（失名结局保留，供读档复活）
    if(key!=="baolu"){ Store.del(CONFIG.slotKey); }
    if(key==="liangyuan" && st.branch==="C" && !st._actsDone){ st._actsDone=true; this.save(); return this.playActs(()=>this.end(key)); }
    const e=endText(key, st.branch);
    UI.go("s-end");
    const art=document.getElementById("end-art");
    const portrait=document.getElementById("end-portrait");
    if(this.isMarryEnding(key)){
      // 出嫁结局：顶部大图（三幕揭晓后才会走到这里，不会提前剧透）
      portrait.style.display="none";
      art.style.display="block";
      art.onerror=function(){ art.style.display="none"; portrait.style.display="block"; portrait.src=CONFIG.branches[st.branch].char; };
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
    const romance=st.branch==="C"&&(st.playerTags["感情"]||0)>=6;
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
    // 失名结局（风评满2出局）特别提示：还有读档机会
    const hintBox=document.getElementById("end-retry");
    if(hintBox){
      if(key==="baolu"){
        const snap=this.readSlot();
        hintBox.textContent = snap
          ? `🌸 不甘心的话，回封面点「换个人生」，从第 ${snap.day||1} 天重来。`
          : "📖 风评已满。回封面可重新开始议婚季。";
        hintBox.style.display="block";
      }else{
        hintBox.style.display="none";
      }
    }
    // 词句回收图鉴（彩蛋线结局后展示）
    const gl=document.getElementById("end-gallery"); gl.innerHTML="";
    if(key==="liangyuan"){
      const ys=st.events.filter(ev=>ev.yishou && st.events.indexOf(ev)<st.idx+1);
      if(ys.length){
        gl.appendChild(UI.el("div","",'<b>📖 词句回收图鉴</b>——这些天你写下的句子：'));
        ys.forEach(ev=>gl.appendChild(UI.el("div","",`第${ev.day}天 · ${ev.shichen}：${ev.checkpoint}`)));
      }
    }
    // 预生成分享卡 + 预写临时文件，让「一键晒结局」点击时同步调 postNote（不丢手势链）
    this._shareCache = null;
    this._preBuildShare();
  },

  /* 预构建分享物料：卡片 + writeTempFile filePath 全部就绪后写入 _shareCache */
  async _preBuildShare(){
    try{
      const { dataUrl, note } = await this.buildEndCard();
      const cache = { dataUrl, note, filePath: null };
      const miniTool = window.xhs && window.xhs.miniTool;
      if(miniTool){
        try{
          const { filePath } = await miniTool.writeTempFile({ data: dataUrl });
          cache.filePath = filePath;
        }catch(e){ /* 非致命，postNote 走降级 */ }
      }
      this._shareCache = cache;
    }catch(e){ console.warn("preBuildShare:", e && e.message); }
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
    const e=endText(endKey, this.state.branch), st=this.state;
    const W=1080,H=1440,cv=document.createElement("canvas");
    cv.width=W; cv.height=H;
    const g=cv.getContext("2d");
    const C={paper:"#FAF8F5",ink:"#1A1A1A",charcoal:"#4A4540",faint:"#8A8478",gamboge:"#C9A84C"};
    const SERIF='"Noto Serif SC","Songti SC",serif';
    const romance=st.branch==="C"&&(st.playerTags["感情"]||0)>=6;
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
      g.fillText(`建中靖国元年 · 春 · 议婚 ${st.day} 天`,W/2,H-500);
      g.fillStyle=C.paper; g.font=`700 96px ${SERIF}`;
      g.fillText(e.title,W/2,H-392);
      g.fillStyle="rgba(250,248,245,.78)"; g.font=`28px ${SERIF}`;
      g.fillText(e.rare,W/2,H-268);
      g.fillStyle=C.paper; g.font=`42px ${SERIF}`;
      wrapText(g,hook,W/2,H-212,W-220,66);
      g.fillStyle="rgba(250,248,245,.6)"; g.font=`28px ${SERIF}`;
      g.fillText("我在宋朝会出嫁吗 · 7 种身份 × 5 个维度",W/2,H-64);
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
      g.fillText("7 种身份 × 5 个维度，你是哪一种人生",W/2,H-110);
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


  /* 生成结局卡图片 + 笔记文案（share / previewCard 共用） */
  async buildEndCard(){
    const endKey=this.state.ended||"wuji";
    const e = endText(endKey, this.state.branch);
    const portrait = await this.loadImage("assets/char-"+this.state.branch+".jpg").catch(()=>null);
    // 出嫁类结局才带结局大图（同域资源，Canvas 导出无跨域问题）
    // 缺图快速回退：1.5s 超时 × 1 次重试，不让缺失资源拖死分享链路
    const art = this.isMarryEnding(endKey)
      ? await this.loadImage("assets/end-"+this.state.branch+".jpg", 1500, 1).catch(()=>null) : null;
    const cv = this.drawEndCard(endKey, portrait, art);
    const dataUrl = cv.toDataURL("image/png");
    return { dataUrl, note:{
      title: `我的宋朝结局：${e.title}`,
      content: `穿越回1101年的汴京议婚季，议婚 ${this.state.day} 天，我的结局是「${e.title}」。\n${e.hook||""}\n\n7种身份×5个维度，测测你会活成谁？\n\n${NOTE_PRESET.tags}`,
      tags: NOTE_PRESET.tags
    }};
  },

  /* 一键晒结局：同步手势内直调 postNote 一步到发布页。
     end() 已预生成卡片+预写 filePath，点击时不 await 任何前置——保住手势链。
     仅当缓存缺失/端能力不可用/直发失败时才回退到预览层。 */
  share(){
    const hint = document.getElementById("share-hint");
    const miniTool = window.xhs && window.xhs.miniTool;
    const cache = this._shareCache;
    // 快路径：缓存就绪 → 同步调 postNote（手势链内）
    if(miniTool && cache && cache.filePath && cache.note){
      hint.textContent="正在唤起发布页……";
      Promise.resolve(miniTool.postNote({
        title: cache.note.title,
        content: cache.note.content,
        tags: cache.note.tags,
        mediaInfo: { image_resources: [{ url: cache.filePath }] }
      })).then(()=>{ hint.textContent="已带入发布页 ✅"; })
        .catch(()=>{ hint.textContent=""; ShareBox.open(cache.dataUrl, cache.note); });
      return;
    }
    // 慢路径：缓存未就绪，现场构建（可能断手势链，降级到预览层）
    hint.textContent="正在生成结局卡……";
    this.buildEndCard().then(({dataUrl, note})=>{
      if(miniTool){
        hint.textContent="正在唤起发布页……";
        return miniTool.writeTempFile({ data: dataUrl }).then(({filePath})=>{
          return Promise.resolve(miniTool.postNote({
            title: note.title, content: note.content, tags: note.tags,
            mediaInfo: { image_resources: [{ url: filePath }] }
          }));
        }).then(()=>{ hint.textContent="已带入发布页 ✅"; })
          .catch(()=>{ hint.textContent=""; ShareBox.open(dataUrl, note); });
      }
      hint.textContent="";
      ShareBox.open(dataUrl, note);
    }).catch(err=>{
      hint.textContent="生成失败，请再试一次";
      console.warn(err && err.errMsg || err);
    });
  },

  /* 预览结局卡 / 存图：打开分享弹层（保存相册 + 发笔记都在层内） */
  async previewCard(){
    const hint = document.getElementById("share-hint");
    hint.textContent="正在生成结局卡……";
    try{
      const { dataUrl, note } = await this.buildEndCard();
      hint.textContent="";
      ShareBox.open(dataUrl, note);
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
    g.textAlign="center";
    if(portrait){
      // 立绘满版铺底（cover，顶部对齐保人物面部）
      const ir=portrait.width/portrait.height, tr=W/H;
      let sw,sh,sx,sy;
      if(ir>tr){ sh=portrait.height; sw=sh*tr; sx=(portrait.width-sw)/2; sy=0; }
      else{ sw=portrait.width; sh=sw/tr; sx=0; sy=0; }
      g.drawImage(portrait,sx,sy,sw,sh,0,0,W,H);
    }else{
      g.fillStyle="#E8E4DC"; g.fillRect(0,0,W,H);
      g.fillStyle=C.faint; g.font="120px serif";
      g.fillText(m.emoji,W/2,H/2-60);
    }
    // 顶部淡渐变（保标题可读）
    let tg=g.createLinearGradient(0,0,0,H*0.28);
    tg.addColorStop(0,"rgba(20,16,12,.55)"); tg.addColorStop(1,"rgba(20,16,12,0)");
    g.fillStyle=tg; g.fillRect(0,0,W,H*0.28);
    // 底部墨渐变压字
    const grad=g.createLinearGradient(0,H*0.42,0,H);
    grad.addColorStop(0,"rgba(20,16,12,0)"); grad.addColorStop(1,"rgba(20,16,12,.92)");
    g.fillStyle=grad; g.fillRect(0,H*0.42,W,H*0.58);
    // 顶部标题
    g.fillStyle="rgba(250,248,245,.85)"; g.font=`30px ${SERIF}`;
    g.fillText("我 在 宋 朝 会 出 嫁 吗",W/2,84);
    // 朱砂印章角标（右上，竖排，固定「宋嫁」二字防溢出）
    g.save(); g.translate(W-92,150); g.rotate(0.06);
    g.fillStyle=C.cinnabar; g.globalAlpha=.92;
    if(typeof g.roundRect==="function"){ g.beginPath(); g.roundRect(-46,-78,92,156,12); g.fill(); }
    else g.fillRect(-46,-78,92,156);
    g.globalAlpha=1; g.fillStyle=C.paper; g.font=`56px ${SERIF}`;
    const _tb=g.textBaseline; g.textBaseline="middle";
    g.fillText("宋",0,-34); g.fillText("嫁",0,34);
    g.textBaseline=_tb;
    g.restore();
    // 底部文案：时序 → 里程碑名 → 判词（无书名号）→ 稀有度 → 落款
    g.fillStyle=C.gamboge; g.font=`34px ${SERIF}`;
    g.fillText(`议婚季 · 第 ${m.day} 天`,W/2,H-420);
    g.fillStyle=C.paper; g.font=`700 84px ${SERIF}`;
    g.fillText(m.emoji+" "+m.title,W/2,H-336);
    g.fillStyle="rgba(250,248,245,.92)"; g.font=`36px ${SERIF}`;
    // 判词换行（去掉书名号，避免符号占行）
    const hook=m.hook; let line="",yy=H-226;
    for(const ch of hook){
      if(g.measureText(line+ch).width>W-200){ g.fillText(line,W/2,yy); line=ch; yy+=56; }
      else line+=ch;
    }
    if(line) g.fillText(line,W/2,yy);
    g.fillStyle="rgba(250,248,245,.6)"; g.font=`26px ${SERIF}`;
    g.fillText(m.rare,W/2,yy+64);
    g.fillText("7 种身份 × 5 个维度 · 你会活成谁",W/2,H-72);
    return cv;
  },

  async shareStamp(){
    const m=this._currentStamp; if(!m) return;
    const hint=document.getElementById("stamp-hint");
    hint.textContent="正在盖章……";
    try{
      const portrait = await this.loadImage("assets/char-"+this.state.branch+".jpg").catch(()=>null);
      const dataUrl=this.drawStampCard(m,portrait).toDataURL("image/png");
      hint.textContent="";
      ShareBox.open(dataUrl, {
        title:`议婚第${m.day}天｜${m.title}`,
        content:`穿越回1101年汴京议婚季的第 ${m.day} 天，我拿到了「${m.title}」。${m.hook} 你会怎么选？\n\n${NOTE_PRESET.tags}`,
        tags:NOTE_PRESET.tags
      });
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
      const e=endText(st.ended, st.branch);
      const b=UI.el("button","btn",`${e.emoji} 结局「${e.title}」 <small style="color:var(--stoneblue)">点我分享</small>`);
      b.addEventListener("click",()=>{ UI.go("s-end"); });
      list.appendChild(b);
    }
    UI.go("s-stamps");
  },

  save(){ if(this.state) Store.set(CONFIG.saveKey, JSON.stringify(this.state)); },
  resume(){
    try{
      this.state=JSON.parse(Store.get(CONFIG.saveKey));
      if(!this.state||!this.state.events||!this.state.events.length) throw 0;
      if(!this.state._sideHist) this.state._sideHist=[];
      if(!this.state.stamps) this.state.stamps=[];
      if(this.state.ended){ this.end(this.state.ended); return; }
      this.renderEvent();
    }catch{ Store.del(CONFIG.saveKey); location.reload(); }
  },
  /* 「再走一遍」：不删档，回封面（可读档重来，也可继续晒印记） */
  backToCover(){ UI.go("s-cover"); this.refreshSlotBtn(); },
  reset(){ Store.del(CONFIG.saveKey); location.reload(); }
};

Engine.init();
