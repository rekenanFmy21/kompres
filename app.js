const DB="media-compressor",STORE="files",CFG="config",QUEUE="queue";
const DEFAULT_GAS_URL="https://script.google.com/macros/s/AKfycbzEls3l9OVnW5rs0iSq9Y73n-zdpnxAs0LfwHLauZg2MZxWtdlL-xnotcCxiuFpnCqwsA/exec";let db,currentFile,currentKind;const $=s=>document.querySelector(s);const $$=s=>document.querySelectorAll(s);
const presets={
 image:{
   fast:["🚀 Fast",.80,1280],
   balanced:["⚖️ Balanced",.85,1920],
   high:["💎 High Quality",.90,2560]
 },
 video:{
   fast:["🚀 Fast",4,720],
   social:["📱 Social Master",6,1080],
   balanced:["⚖️ Balanced",8,1080],
   high:["💎 High Quality",12,1440]
 }
};

/* UP SOSMED — preset terpisah. Tidak mengubah preset Kompres Biasa. */
const socialProfiles={
  instagram:{
    image:{
      feed:["📸 Feed 1:1 / 4:5",.88,1080,1080,"Maks. 1080px • kualitas tinggi • rasio asli dipertahankan"],
      story:["📱 Story",.88,1080,1920,"Maks. 1080×1920 • rasio asli dipertahankan"],
      portrait:["🖼️ Feed Portrait 4:5",.88,1080,1350,"Maks. 1080×1350 • rasio asli dipertahankan"]
    },
    video:{
      story:["📱 Story / Reels",6,1080,30,"1080p • ±6 Mbps • 30 FPS"],
      feed:["🎬 Feed Video",6,1080,30,"1080p • ±6 Mbps • 30 FPS"],
      high:["💎 Reels High",8,1080,30,"1080p • ±8 Mbps • 30 FPS"]
    }
  },
  whatsapp:{
    image:{
      status:["💬 Status Foto",.86,1080,1920,"Maks. 1080×1920 • kualitas tinggi"],
      send:["📷 Kirim Foto",.86,1600,1600,"Maks. 1600px • kualitas tinggi"],
      original:["🖼️ Foto Jernih",.90,2048,2048,"Maks. 2048px • kualitas sangat tinggi"]
    },
    video:{
      status:["💬 Status Video",5,1080,30,"1080p • ±5 Mbps • 30 FPS"],
      send:["🎬 Kirim Video",5,1080,30,"1080p • ±5 Mbps • 30 FPS"]
    }
  },
  facebook:{
    image:{
      post:["📘 Post Foto",.90,2048,2048,"Maks. 2048px • kualitas tinggi"],
      portrait:["🖼️ Post Portrait",.90,2048,2560,"Maks. 2048×2560 • rasio asli dipertahankan"],
      story:["📱 Story",.88,1080,1920,"Maks. 1080×1920 • kualitas tinggi"]
    },
    video:{
      post:["🎬 Feed Video",8,1080,30,"1080p • ±8 Mbps • 30 FPS"],
      story:["📱 Story Video",6,1080,30,"1080p • ±6 Mbps • 30 FPS"],
      high:["💎 Video High",10,1440,30,"1440p • ±10 Mbps • 30 FPS"]
    }
  }
};
let socialPlatform="instagram",socialKind="image",socialFile=null,socialPresetKey="feed";
let editFile=null,editDuration=0,editSpeedValue=1;

function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,2);r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id"});if(!d.objectStoreNames.contains(CFG))d.createObjectStore(CFG,{keyPath:"key"});if(!d.objectStoreNames.contains(QUEUE))d.createObjectStore(QUEUE,{keyPath:"id"})};r.onsuccess=()=>{db=r.result;res(db)};r.onerror=()=>rej(r.error)})}
function tx(mode,store=STORE){return db.transaction(store,mode).objectStore(store)}
function queuePut(v){return new Promise((r,j)=>{const q=tx("readwrite",QUEUE).put(v);q.onsuccess=()=>r();q.onerror=()=>j(q.error)})}
function queueDel(id){return new Promise(r=>{const q=tx("readwrite",QUEUE).delete(id);q.onsuccess=()=>r()})}
function queueAll(){return new Promise((r,j)=>{const q=tx("readonly",QUEUE).getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)})}
async function enqueue(item){await queuePut({id:item.id,createdAt:Date.now(),attempts:item.uploadAttempts||0,status:"PENDING"})}
async function dequeue(id){await queueDel(id)}
function put(v){return new Promise((r,j)=>{const q=tx("readwrite").put(v);q.onsuccess=()=>r();q.onerror=()=>j(q.error)})}
function all(){return new Promise((r,j)=>{const q=tx("readonly").getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)})}
function del(id){return new Promise(r=>{const q=tx("readwrite").delete(id);q.onsuccess=()=>r()})}
async function cfg(key,def){return new Promise(r=>{const q=tx("readonly",CFG).get(key);q.onsuccess=()=>r(q.result?.value??def)})}
async function setCfg(key,value){return new Promise(r=>{const q=tx("readwrite",CFG).put({key,value});q.onsuccess=()=>r()})}
function go(id,kind){$$(".page").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active");$$("nav button").forEach(b=>b.classList.toggle("nav-active",b.dataset.go===id));if(id==="compress"&&kind)setup(kind);if(id==="social")setupSocial();if(id==="editor")setupEditor();if(id==="files")renderFiles();if(id==="settings")loadSettings();if(id==="home")refreshHome();scrollTo(0,0)}
$$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go,b.dataset.kind));
function setup(kind){currentKind=kind;const p=presets[kind]||presets.image;$("#compressTitle").textContent=kind==="image"?"Kompres Foto":"Kompres Video";$("#fileInput").accept=kind==="image"?"image/*":"video/*";const s=$("#preset");s.innerHTML=Object.entries(p).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join("");s.value=kind==="image"?"fast":"fast";cfg(kind+"Default",s.value).then(v=>{if(p[v])s.value=v})}
$("#fileInput").onchange=e=>loadFile(e.target.files[0]);
async function loadFile(file){if(!file)return;currentKind=file.type.startsWith("video")?"video":"image";currentFile=file;setup(currentKind);$("#original").classList.remove("hidden");$("#presets").classList.remove("hidden");const k=$("#preset").value;$("#estimate").classList.remove("hidden");$("#estimate").textContent=`Estimasi hasil: ~${fmt(compressionEstimate(file.size,currentKind,k))}`;$("#result").classList.add("hidden");const u=URL.createObjectURL(file);$("#original").innerHTML=`<div class="stats"><div class="stat"><small>Nama</small>${esc(file.name)}</div><div class="stat"><small>Ukuran</small>${fmt(file.size)}</div><div class="stat"><small>Tipe</small>${file.type||"unknown"}</div></div>${currentKind==="image"?`<img class="preview" src="${u}" alt="">`:`<video class="preview" src="${u}" controls playsinline></video>`}`}
$("#compressBtn").onclick=async()=>{if(!currentFile)return;showProgress("Mengompres...",5);try{const preset=$("#preset").value||Object.keys(presets[currentKind])[0];const profile=presets[currentKind][preset];if(!profile)throw Error("Preset kompresi belum tersedia");const blob=currentKind==="image"?await compressImage(currentFile,profile):await compressVideo(currentFile,profile);showProgress("Menyimpan lokal...",90);const id="MC-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);const ext=currentKind==="image"?"jpg":"webm";const name=`${base(currentFile.name)}_${preset.toUpperCase()}.${ext}`;const item={id,name,originalName:currentFile.name,type:currentKind,originalSize:currentFile.size,size:blob.size,blob,createdAt:Date.now(),preset,status:"LOCAL"};await put(item);await enqueue(item);showProgress("Selesai • tersimpan lokal",100);showResult(item);if(navigator.onLine&&await cloudEnabled())syncPending()}catch(e){console.error(e);showProgress("Gagal",0);alert("Kompresi gagal: "+e.message)}};
function setupEditor(){
  updateEditSpeedUI(editSpeedValue);
}
function clampSpeed(v){v=Number(v);if(!Number.isFinite(v))v=1;return Math.min(20,Math.max(.25,v))}
function formatDuration(sec){if(!Number.isFinite(sec))return "—";const s=Math.max(0,sec);const m=Math.floor(s/60),r=s-m*60;return `${m}:${r.toFixed(1).padStart(4,"0")}`}
function updateEditSpeedUI(v){
  editSpeedValue=clampSpeed(v);
  const rounded=editSpeedValue.toFixed(2).replace(/\.00$/,'');
  $("#editSpeed").value=editSpeedValue;
  $("#editSpeedRange").value=editSpeedValue;
  $("#speedValue").textContent=`${rounded}×`;
  const start=Number($("#editStart")?.value)||0,end=Number($("#editEnd")?.value)||editDuration;
  const kept=Math.max(0,end-start);$("#speedDuration").textContent=`Durasi hasil: ${formatDuration(kept/editSpeedValue)}`;
  $$("#speedPresets button").forEach(b=>b.classList.toggle("active",Math.abs(Number(b.dataset.speed)-editSpeedValue)<.001));
}
function updateEditTrimUI(){
  let start=Number($("#editStart").value)||0,end=Number($("#editEnd").value)||editDuration;
  start=Math.min(Math.max(0,start),editDuration);end=Math.min(Math.max(0,end),editDuration);
  if(end<start)end=start;
  $("#editStart").value=start.toFixed(1);$("#editEnd").value=end.toFixed(1);
  const left=editDuration?(start/editDuration)*100:0,width=editDuration?((end-start)/editDuration)*100:0;
  $("#trimRange").style.marginLeft=left+"%";$("#trimRange").style.width=width+"%";
  $("#editDuration").textContent=`Durasi asli: ${formatDuration(editDuration)} • Dipakai: ${formatDuration(end-start)}`;
  updateEditSpeedUI(editSpeedValue);
}
async function loadEditVideo(file){
  if(!file)return;
  const isVideo=file.type.startsWith("video/")||/\.(mp4|m4v|mov|webm|mkv|avi|ogv)$/i.test(file.name||"");
  if(!isVideo){alert("Pilih file video (MP4, M4V, MOV, WebM, MKV, AVI, OGV).");return}
  editFile=file;$("#editControls").classList.remove("hidden");$("#editResult").classList.add("hidden");
  const u=URL.createObjectURL(file),v=document.createElement("video");v.src=u;v.preload="metadata";v.muted=true;v.playsInline=true;
  try{await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=()=>j(Error("Video tidak dapat dibaca"))});editDuration=v.duration;$("#editStart").value="0.0";$("#editEnd").value=editDuration.toFixed(1);$("#editOriginal").classList.remove("hidden");$("#editOriginal").innerHTML=`<div class="stats"><div class="stat"><small>Nama</small>${esc(file.name)}</div><div class="stat"><small>Ukuran</small>${fmt(file.size)}</div><div class="stat"><small>Durasi</small>${formatDuration(editDuration)}</div></div><video id="editPreview" class="preview" src="${u}" controls playsinline></video>`;updateEditTrimUI()}catch(e){URL.revokeObjectURL(u);alert(e.message)}
}
function setEditSpeed(v){updateEditSpeedUI(v)}
async function processEditedVideo(){
  if(!editFile)return;
  let start=Number($("#editStart").value),end=Number($("#editEnd").value),speed=clampSpeed($("#editSpeed").value);
  if(!Number.isFinite(start))start=0;if(!Number.isFinite(end)||end<=0)end=editDuration;
  start=Math.min(Math.max(0,start),editDuration);end=Math.min(Math.max(0,end),editDuration);
  if(end<=start){alert("Waktu selesai harus lebih besar dari waktu mulai.");return}
  if(!Number.isFinite(speed)||speed<.25||speed>20){alert("Kecepatan harus antara 0.25× sampai 20×.");return}
  $("#editProcessBtn").disabled=true;$("#editProgress").classList.remove("hidden");$("#editResult").classList.add("hidden");
  const src=URL.createObjectURL(editFile),v=document.createElement("video");v.src=src;v.muted=false;v.playsInline=true;v.preload="auto";
  try{
    await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=()=>j(Error("Video tidak dapat dibaca"))});
    await new Promise((r,j)=>{if(v.readyState>=2)r();else{v.oncanplay=r;v.onerror=()=>j(Error("Video belum siap diproses"))}});
    v.currentTime=start;await new Promise(r=>{v.onseeked=r});
    const scale=Math.min(1,1920/Math.max(v.videoWidth,v.videoHeight));
    const c=document.createElement("canvas");c.width=Math.max(1,Math.round(v.videoWidth*scale));c.height=Math.max(1,Math.round(v.videoHeight*scale));
    const ctx=c.getContext("2d");const stream=c.captureStream(30);
    try{const sourceStream=v.captureStream?v.captureStream():v.mozCaptureStream?v.mozCaptureStream():null;if(sourceStream)sourceStream.getAudioTracks().forEach(t=>stream.addTrack(t))}catch(e){console.warn("Audio capture tidak tersedia",e)}
    const mime=MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")?"video/webm;codecs=vp9,opus":"video/webm";
    const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:Math.min(12000000,Math.max(2500000,Math.round((editFile.size*8/Math.max(.1,end-start))*0.55)))});
    const chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
    const done=new Promise((resolve,reject)=>{rec.onstop=()=>resolve(new Blob(chunks,{type:mime}));rec.onerror=e=>reject(e.error||Error("Recorder falhou"))});
    rec.start(250);v.playbackRate=speed;try{v.preservesPitch=false;v.mozPreservesPitch=false;v.webkitPreservesPitch=false}catch{};
    await v.play();
    const sourceDuration=end-start;let last=0;
    await new Promise((resolve,reject)=>{
      const tick=()=>{
        if(v.currentTime>=end-0.02||v.ended){try{v.pause()}catch{};if(rec.state!=="inactive")rec.stop();resolve();return}
        ctx.drawImage(v,0,0,c.width,c.height);
        const ratio=Math.max(0,Math.min(1,(v.currentTime-start)/sourceDuration));const pct=Math.min(96,5+ratio*90);
        if(pct-last>.3){last=pct;$("#editBar").style.width=pct+"%";$("#editProgressText").textContent=Math.round(pct)+"%";$("#editProgressLabel").textContent=`Memproses ${speed.toFixed(2)}×...`}
        requestAnimationFrame(tick)
      };tick();
    });
    const blob=await done;$("#editBar").style.width="98%";$("#editProgressText").textContent="98%";$("#editProgressLabel").textContent="Menyimpan lokal...";
    const id="MC-EDIT-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),ext="webm";
    const speedName=speed.toFixed(2).replace(/\.00$/,'').replace('.','p');
    const name=`${base(editFile.name)}_CUT_${start.toFixed(1).replace('.','p')}-${end.toFixed(1).replace('.','p')}_SPEED_${speedName}X.${ext}`;
    const item={id,name,originalName:editFile.name,type:"video",originalSize:editFile.size,size:blob.size,blob,createdAt:Date.now(),preset:"EDIT_VIDEO",editType:"cut_speed",editStart:start,editEnd:end,editSpeed:speed,status:"LOCAL"};
    await put(item);await enqueue(item);$("#editBar").style.width="100%";$("#editProgressText").textContent="100%";$("#editProgressLabel").textContent="Selesai • tersimpan lokal";
    const resultUrl=URL.createObjectURL(blob);$("#editResult").classList.remove("hidden");$("#editResult").innerHTML=`<h3>✓ Edit video selesai</h3><div class="stats"><div class="stat"><small>Potongan</small>${formatDuration(end-start)}</div><div class="stat"><small>Kecepatan</small>${speed.toFixed(2)}×</div><div class="stat"><small>Hasil</small>${fmt(blob.size)}</div></div><div class="editor-result-note">Hasil tersimpan lokal • ${esc(name)}</div><video class="preview" src="${resultUrl}" controls playsinline></video><button class="primary" onclick="downloadItem('${id}')">Download hasil</button><button class="ghost" onclick="uploadItemById('${id}')">Upload ke Drive</button>`;
    if(navigator.onLine&&await cloudEnabled())syncPending();
  }catch(e){console.error(e);$("#editProgressLabel").textContent="Gagal";alert("Edit video gagal: "+e.message)}
  finally{URL.revokeObjectURL(src);try{v.pause()}catch{};$("#editProcessBtn").disabled=false}
}

function setupSocial(){
  const p=socialProfiles[socialPlatform][socialKind];
  const select=$("#socialPreset");
  select.innerHTML=Object.entries(p).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join("");
  if(!p[socialPresetKey])socialPresetKey=Object.keys(p)[0];
  select.value=socialPresetKey;
  $("#socialImageBtn").classList.toggle("active",socialKind==="image");
  $("#socialVideoBtn").classList.toggle("active",socialKind==="video");
  $("#socialFileInput").accept=socialKind==="image"?"image/*":"video/*";
  updateSocialSpec();
}
function updateSocialSpec(){
  const p=socialProfiles[socialPlatform][socialKind][$("#socialPreset").value||Object.keys(socialProfiles[socialPlatform][socialKind])[0]];
  if(!p)return;
  $("#socialSpec").innerHTML=`<b>${esc(p[0])}</b><small>${esc(p[4])}</small>`;
}
function setSocialPlatform(platform){
  socialPlatform=platform;socialPresetKey=Object.keys(socialProfiles[platform][socialKind])[0];
  $$("#socialPlatforms .platform").forEach(b=>b.classList.toggle("active",b.dataset.platform===platform));
  setupSocial();
}

// EDIT VIDEO: robust file picker + drag/drop binding.
const editFileInput=$("#editFileInput");
const editDrop=$("#editDrop");
if(editFileInput){
  editFileInput.accept="video/*,.mp4,.m4v,.mov,.webm,.mkv,.avi";
  editFileInput.addEventListener("change",e=>{
    const f=e.target.files && e.target.files[0];
    if(f) loadEditVideo(f);
    // Allow selecting the same file again.
    e.target.value="";
  });
}
if(editDrop){
  editDrop.addEventListener("keydown",e=>{
    if(e.key==="Enter"||e.key===" "){
      e.preventDefault();
      editFileInput?.click();
    }
  });
  ["dragenter","dragover"].forEach(ev=>editDrop.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();editDrop.classList.add("drag")}));
  ["dragleave","drop"].forEach(ev=>editDrop.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();editDrop.classList.remove("drag")}));
  editDrop.addEventListener("drop",e=>{
    const f=e.dataTransfer?.files?.[0];
    if(f) loadEditVideo(f);
  });
}
$("#editStart").oninput=updateEditTrimUI;
$("#editEnd").oninput=updateEditTrimUI;
$("#editSpeed").oninput=e=>updateEditSpeedUI(e.target.value);
$("#editSpeedRange").oninput=e=>updateEditSpeedUI(e.target.value);
$$("#speedPresets button").forEach(b=>b.onclick=()=>setEditSpeed(b.dataset.speed));
$("#editProcessBtn").onclick=processEditedVideo;
function setSocialKind(kind){
  socialKind=kind;socialPresetKey=Object.keys(socialProfiles[socialPlatform][kind])[0];
  setupSocial();
  socialFile=null;$("#socialOriginal").classList.add("hidden");$("#socialResult").classList.add("hidden");$("#socialCompressBtn").disabled=true;
}
async function loadSocialFile(file){
  if(!file)return;
  const expected=socialKind==="image"?"image/":"video/";
  if(!file.type.startsWith(expected)){alert(`Pilih ${socialKind==="image"?"foto":"video"} untuk preset ini.`);return}
  socialFile=file;$("#socialOriginal").classList.remove("hidden");$("#socialResult").classList.add("hidden");$("#socialCompressBtn").disabled=false;
  const u=URL.createObjectURL(file);
  $("#socialOriginal").innerHTML=`<div class="stats"><div class="stat"><small>Nama</small>${esc(file.name)}</div><div class="stat"><small>Ukuran</small>${fmt(file.size)}</div><div class="stat"><small>Target</small>${esc(socialProfiles[socialPlatform][socialKind][$("#socialPreset").value][0])}</div></div>${socialKind==="image"?`<img class="preview" src="${u}" alt="">`:`<video class="preview" src="${u}" controls playsinline></video>`}`;
}
async function compressSocialImage(file,profile){
  const quality=profile[1],maxW=profile[2],maxH=profile[3];
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error("Foto tidak dapat dibaca"));i.src=url});
    const scale=Math.min(1,maxW/img.naturalWidth,maxH/img.naturalHeight);
    const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
    const c=document.createElement("canvas");c.width=w;c.height=h;
    const ctx=c.getContext("2d",{alpha:false});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(img,0,0,w,h);
    return await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error("Gagal membuat JPG")),"image/jpeg",quality));
  }finally{URL.revokeObjectURL(url)}
}
async function compressSocialVideo(file,profile){
  const mbps=profile[1],maxH=profile[2];
  if(!("MediaRecorder"in window))throw Error("Browser tidak mendukung MediaRecorder");
  const v=document.createElement("video");v.src=URL.createObjectURL(file);v.muted=true;v.playsInline=true;
  await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=()=>j(Error("Video tidak dapat dibaca"))});
  const scale=Math.min(1,maxH/Math.max(v.videoWidth,v.videoHeight));
  const c=document.createElement("canvas");c.width=Math.max(1,Math.round(v.videoWidth*scale));c.height=Math.max(1,Math.round(v.videoHeight*scale));
  const ctx=c.getContext("2d");const stream=c.captureStream(30);
  try{const audio=v.captureStream().getAudioTracks();audio.forEach(t=>stream.addTrack(t))}catch{}
  const mime=MediaRecorder.isTypeSupported("video/mp4")?"video/mp4":MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")?"video/webm;codecs=vp9,opus":"video/webm";
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:mbps*1e6,audioBitsPerSecond:128000});
  const chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  const done=new Promise((r,j)=>{rec.onstop=()=>r(new Blob(chunks,{type:mime}));rec.onerror=e=>j(e.error||Error("Recorder gagal"))});
  rec.start(1000);v.currentTime=0;await v.play();
  const tick=()=>{if(v.ended){rec.stop();return}ctx.drawImage(v,0,0,c.width,c.height);const p=Math.min(89,(v.currentTime/v.duration)*84+6);$("#socialBar").style.width=p+"%";$("#socialProgressText").textContent=Math.round(p)+"%";requestAnimationFrame(tick)};tick();
  return done.finally(()=>{URL.revokeObjectURL(v.src);stream.getTracks().forEach(t=>t.stop())});
}
function showSocialProgress(label,p){
  $("#socialProgress").classList.remove("hidden");$("#socialBar").style.width=p+"%";$("#socialProgressText").textContent=Math.round(p)+"%";$("#socialProgressLabel").textContent=label;
}
async function processSocial(){
  if(!socialFile)return;
  const key=$("#socialPreset").value,p=socialProfiles[socialPlatform][socialKind][key];
  showSocialProgress("Menyiapkan...",5);
  try{
    const blob=socialKind==="image"?await compressSocialImage(socialFile,p):await compressSocialVideo(socialFile,p);
    showSocialProgress("Menyimpan lokal...",94);
    const id="MC-SOC-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);
    const ext=blob.type==="image/jpeg"?"jpg":blob.type==="video/mp4"?"mp4":"webm";
    const name=`${base(socialFile.name)}_${socialPlatform.toUpperCase()}_${key.toUpperCase()}.${ext}`;
    const item={id,name,originalName:socialFile.name,type:socialKind,originalSize:socialFile.size,size:blob.size,blob,createdAt:Date.now(),preset:`SOSMED_${socialPlatform}_${key}`,socialPlatform,socialTarget:key,status:"LOCAL"};
    await put(item);await enqueue(item);showSocialProgress("Selesai • tersimpan lokal",100);showSocialResult(item);
    if(navigator.onLine&&await cloudEnabled())syncPending();
  }catch(e){console.error(e);showSocialProgress("Gagal",0);alert("UP SOSMED gagal: "+e.message)}
}
function showSocialResult(x){
  const save=x.originalSize?((1-x.size/x.originalSize)*100):0;
  $("#socialResult").classList.remove("hidden");
  $("#socialResult").innerHTML=`<h3>✓ Siap untuk ${esc(x.socialPlatform)}</h3><div class="stats"><div class="stat"><small>Original</small>${fmt(x.originalSize)}</div><div class="stat"><small>Hasil</small>${fmt(x.size)}</div><div class="stat"><small>Hemat</small>${Math.max(0,save).toFixed(1)}%</div></div><div class="social-result-note">Preset: <b>${esc(x.socialTarget)}</b> • ${x.type==="image"?"JPG":"Video"}</div><button class="primary" onclick="downloadItem('${x.id}')">Download hasil</button><button class="ghost" onclick="uploadItemById('${x.id}')">Upload ke Drive</button>`;
}
function showProgress(label,p){$("#progress").classList.remove("hidden");$("#bar").style.width=p+"%";$("#progressText").textContent=Math.round(p)+"%";$("#progressLabel").textContent=label}

function compressionEstimate(size,kind,preset){const ratio=kind==="image" ? (preset==="fast" ? .28 : preset==="balanced" ? .38 : .52) : (preset==="fast" ? .45 : preset==="balanced" ? .58 : .72);return Math.max(1,Math.round(size*ratio));}
async function compressImage(file,profile){
  const quality=profile?.[1]??.80, max=profile?.[2]??1280;
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error("Foto tidak dapat dibaca"));i.src=url});
    const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
    const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
    const c=document.createElement("canvas"); c.width=w;c.height=h;
    const ctx=c.getContext("2d",{alpha:false});
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(img,0,0,w,h);
    return await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error("Gagal membuat hasil JPG")),"image/jpeg",quality));
  }finally{URL.revokeObjectURL(url)}
}
async function compressVideo(file,profile){const mbps=profile?.[1]??4,maxH=profile?.[2]??720;if(!("MediaRecorder"in window))throw Error("Browser tidak mendukung MediaRecorder");const v=document.createElement("video");v.src=URL.createObjectURL(file);v.muted=false;v.playsInline=true;await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=()=>j(Error("Video tidak dapat dibaca"))});const scale=Math.min(1,maxH/Math.max(v.videoWidth,v.videoHeight));const c=document.createElement("canvas");c.width=Math.round(v.videoWidth*scale);c.height=Math.round(v.videoHeight*scale);const ctx=c.getContext("2d");const stream=c.captureStream(30);try{const audio=v.captureStream().getAudioTracks();audio.forEach(t=>stream.addTrack(t))}catch{}const mime=MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")?"video/webm;codecs=vp9,opus":"video/webm";const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:mbps*1e6,audioBitsPerSecond:128000});const chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);const done=new Promise(r=>rec.onstop=()=>r(new Blob(chunks,{type:mime})));rec.start(1000);v.currentTime=0;await v.play();const tick=()=>{if(v.ended){rec.stop();return}ctx.drawImage(v,0,0,c.width,c.height);const p=Math.min(89,(v.currentTime/v.duration)*84+6);showProgress("Mengompres video...",p);requestAnimationFrame(tick)};tick();return done.finally(()=>{URL.revokeObjectURL(v.src);stream.getTracks().forEach(t=>t.stop())})}
function showResult(x){const save=x.originalSize?((1-x.size/x.originalSize)*100):0;$("#result").classList.remove("hidden");$("#result").innerHTML=`<h3>✓ Kompres selesai</h3><div class="stats"><div class="stat"><small>Original</small>${fmt(x.originalSize)}</div><div class="stat"><small>Hasil</small>${fmt(x.size)}</div><div class="stat"><small>Hemat</small>${Math.max(0,save).toFixed(1)}%</div></div>${x.type==="image"?`<img class="preview" src="${URL.createObjectURL(x.blob)}">`:`<video class="preview" src="${URL.createObjectURL(x.blob)}" controls playsinline></video>`}<button class="primary" onclick="downloadItem('${x.id}')">Download hasil</button><button class="ghost" onclick="uploadItemById('${x.id}')">Upload ke Drive</button>`}
async function downloadItem(id){const x=(await all()).find(a=>a.id===id);if(!x)return;const a=document.createElement("a");a.href=URL.createObjectURL(x.blob);a.download=x.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function uploadItemById(id){const x=(await all()).find(a=>a.id===id);if(x)uploadItem(x)}
async function cloudEnabled(){return (await cfg("cloudMode","local"))==="local_cloud"}
async function syncPending(){if(!navigator.onLine||!(await cloudEnabled()))return;const q=await queueAll();for(const item of q.filter(x=>x.status!=="UPLOADED")){const file=(await all()).find(x=>x.id===item.id);if(file)await uploadItem(file)}}
async function uploadItem(x){
  if(!x)return false;
  if(!navigator.onLine){x.status="LOCAL";await put(x);await enqueue(x);return false}
  const url=await cfg("gasUrl","");
  if(!url){x.status="LOCAL";await put(x);await enqueue(x);return false}
  try{
    const q=(await queueAll()).find(i=>i.id===x.id);
    const attempts=(q?.attempts||0)+1;
    if(q)await queuePut({...q,attempts,status:"UPLOADING",lastAttemptAt:Date.now()}); else await queuePut({id:x.id,createdAt:x.createdAt,attempts,status:"UPLOADING",lastAttemptAt:Date.now()});
    const data=await blobToBase64(x.blob);
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"uploadFile",id:x.id,name:x.name,mime:x.blob.type,type:x.type,size:x.size,originalName:x.originalName,originalSize:x.originalSize,data})});
    const out=await r.json();if(!out.ok)throw Error(out.error||"Upload gagal");
    x.status="UPLOADED";x.driveFileId=out.fileId;x.driveUrl=out.url;await put(x);await dequeue(x.id);renderFiles();return true;
  }catch(e){
    x.status="LOCAL";await put(x);await queuePut({id:x.id,createdAt:x.createdAt,attempts:((await queueAll()).find(i=>i.id===x.id)?.attempts||1),status:"PENDING",lastError:String(e.message||e),lastAttemptAt:Date.now()});console.warn("Cloud sync ditunda:",e);return false;
  }
}

function blobToBase64(b){return new Promise((r,j)=>{const f=new FileReader();f.onload=()=>r(f.result.split(",")[1]);f.onerror=j;f.readAsDataURL(b)})}
async function refreshHome(){const a=await all(),q=await queueAll();$("#homeCount").textContent=a.length;$("#statLocal").textContent=a.length;$("#statCloud").textContent=a.filter(x=>x.status==="UPLOADED").length;$("#statPending").textContent=q.length;const recent=a.sort((x,y)=>y.createdAt-x.createdAt).slice(0,4);$("#recentList").innerHTML=recent.length?recent.map(x=>`<div class="recent-item"><div class="recent-dot">${x.type==="image"?"IMG":"VID"}</div><div class="recent-meta"><b>${esc(x.name)}</b><small>${fmt(x.size)} • ${new Date(x.createdAt).toLocaleDateString("id-ID")}</small></div><span class="recent-status ${x.status==="UPLOADED"?"ok":"pending"}">${x.status==="UPLOADED"?"DRIVE ✓":"PENDING"}</span></div>`).join(""):"<div class='empty'>Belum ada hasil kompres.</div>"}
let libraryMode="local";
async function renderFiles(){
  const q=$("#search").value.toLowerCase(),f=$("#filter").value;
  if(libraryMode==="drive"){return renderDrive(q)}
  let a=await all();
  const queued=new Set((await queueAll()).map(x=>x.id));
  a=a.filter(x=>(!q||x.name.toLowerCase().includes(q))&&(f==="all"||(f==="pending"&&queued.has(x.id))||(f==="drive"&&x.status==="UPLOADED")||f===x.type)).sort((a,b)=>b.createdAt-a.createdAt);
  $("#fileList").classList.remove("hidden"); $("#folderList").classList.add("hidden");
  $("#libraryHint").textContent="File hasil kompres yang tersimpan di browser (IndexedDB).";
  $("#pickFolder").classList.remove("hidden"); $("#refreshDrive").classList.add("hidden");
  $("#fileList").innerHTML=a.length?a.map(x=>`<article class="item"><div class="thumb">${x.type==="image"?`<img src="${URL.createObjectURL(x.blob)}" class="thumb">`:"🎥"}</div><div class="meta"><b>${esc(x.name)}</b><small>${fmt(x.size)} • ${new Date(x.createdAt).toLocaleString("id-ID")}</small><div class="status ${x.status==="UPLOADED"?"ok":"pending"}">${x.status==="UPLOADED"?"LOCAL ✓ • CLOUD ✓":(queued.has(x.id)?"LOCAL ✓ • QUEUE ⏳":"LOCAL ✓ • TERSIMPAN")}</div></div><div class="actions"><button onclick="downloadItem('${x.id}')">Download</button><button onclick="deleteItem('${x.id}')">Hapus</button></div></article>`).join(""):"<div class='card'><p class='hint'>Belum ada hasil kompres lokal.</p></div>";
  updateStorage(); refreshHome();
}
async function renderDrive(q=""){
  $("#fileList").classList.add("hidden"); $("#folderList").classList.remove("hidden");
  $("#pickFolder").classList.add("hidden"); $("#refreshDrive").classList.remove("hidden");
  $("#libraryHint").textContent="File yang tersimpan di folder Google Drive yang terhubung.";
  const url=await cfg("gasUrl",DEFAULT_GAS_URL);
  $("#folderList").innerHTML="<div class='card'><p class='hint'>Mencari file di Google Drive...</p></div>";
  try{
    const r=await fetch(url+"?action=listFiles&q="+encodeURIComponent(q),{cache:"no-store"});
    const out=await r.json();
    if(!out.ok) throw Error(out.error||"Gagal membaca Drive");
    $("#folderList").innerHTML=out.files.length?out.files.map(x=>`<div class="drive-item"><div class="drive-icon">${x.mime.startsWith("image/")?"IMG":"FILE"}</div><div class="drive-meta"><b>${esc(x.name)}</b><small>${fmt(x.size)} • ${new Date(x.updated).toLocaleString("id-ID")}</small></div><a class="ghost" target="_blank" rel="noopener" href="${x.url}">Buka</a></div>`).join(""):"<div class='card'><p class='hint'>File Drive tidak ditemukan.</p></div>";
  }catch(e){$("#folderList").innerHTML=`<div class="card"><p class="hint">Drive belum dapat dibaca: ${esc(e.message)}</p><button class="primary" onclick="go('settings')">Periksa GAS</button></div>`}
}
async function compressLocalFolderFile(index){
  const x=(window.__localFolderFiles||[])[index]; if(!x||!x.handle)return;
  try{
    const f=await x.handle.getFile();
    const dt=new DataTransfer(); dt.items.add(f);
    $("#fileInput").files=dt.files;
    libraryMode="local"; go("compress");
    $("#fileInput").dispatchEvent(new Event("change",{bubbles:true}));
  }catch(e){alert("File lokal tidak dapat dibuka: "+e.message)}
}
window.compressLocalFolderFile=compressLocalFolderFile;
async function pickLocalFolder(){
  if(!window.showDirectoryPicker){alert("Browser ini belum mendukung pembacaan folder lokal langsung. Gunakan Chrome/Edge terbaru.");return}
  try{
    const dir=await window.showDirectoryPicker({mode:"read"});
    const files=[];
    async function walk(handle,path=""){
      for await(const [name,h] of handle.entries()){
        if(h.kind==="file"){const f=await h.getFile();if(/^image\/|^video\//.test(f.type)||/\.(jpe?g|png|webp|gif|mp4|mov|webm|mkv)$/i.test(name))files.push({name,size:f.size,type:f.type,lastModified:f.lastModified,path:path+name,handle:h})}
        else if(h.kind==="directory")await walk(h,path+name+"/");
      }
    }
    await walk(dir);
    $("#fileList").classList.add("hidden");$("#folderList").classList.remove("hidden");
    $("#libraryHint").textContent=`${files.length} media ditemukan di folder "${dir.name}".`;
    const q=$("#search").value.toLowerCase();
    window.__localFolderFiles=files; const shown=files.filter(x=>!q||x.name.toLowerCase().includes(q));
    $("#folderList").innerHTML=shown.length?shown.map(x=>`<div class="folder-file"><div class="drive-icon">${x.type.startsWith("image/")?"IMG":"VID"}</div><div><b>${esc(x.name)}</b><small>${esc(x.path)} • ${fmt(x.size)}</small></div><button class="ghost" onclick="compressLocalFolderFile(${files.indexOf(x)})">Kompres</button></div>`).join(""):"<div class='card'><p class='hint'>Tidak ada media yang cocok.</p></div>";
  }catch(e){if(e.name!=="AbortError")alert("Folder tidak dapat dibaca: "+e.message)}
}
async function deleteItem(id){const x=(await all()).find(a=>a.id===id);if(!x)return;if(!confirm("Hapus file lokal? File Drive tidak akan dihapus otomatis."))return;await del(id);renderFiles()}
$("#search").oninput=()=>renderFiles();$("#filter").onchange=()=>renderFiles();$("#tabLocal").onclick=()=>{libraryMode="local";$("#tabLocal").classList.add("active");$("#tabDrive").classList.remove("active");$("#search").placeholder="Cari file lokal...";renderFiles()};
$("#tabDrive").onclick=()=>{libraryMode="drive";$("#tabDrive").classList.add("active");$("#tabLocal").classList.remove("active");$("#search").placeholder="Cari file di Google Drive...";renderFiles()};
$("#refreshDrive").onclick=()=>renderDrive($("#search").value.trim());
$("#pickFolder").onclick=pickLocalFolder; window.pickLocalFolder=pickLocalFolder;

async function loadSettings(){$("#imageDefault").value=await cfg("imageDefault","balanced");$("#videoDefault").value=await cfg("videoDefault","social");$("#cloudMode").value=await cfg("cloudMode","local");$("#autoRetry").checked=await cfg("autoRetry",true);$("#speedDefault").value=await cfg("speedDefault","fast");$("#gasUrl").value=await cfg("gasUrl",DEFAULT_GAS_URL);updateStorage();updateCloudUI()}

["imageDefault","videoDefault","autoRetry"].forEach(id=>$("#"+id).onchange=()=>{const k=id==="imageDefault"?"imageDefault":id==="videoDefault"?"videoDefault":id;setCfg(k,$("#"+id).type==="checkbox"?$("#"+id).checked:$("#"+id).value)});
$("#cloudMode").onchange=async()=>{await setCfg("cloudMode",$("#cloudMode").value);updateCloudUI();if($("#cloudMode").value==="local_cloud"&&navigator.onLine)syncPending()};
$("#syncNow").onclick=async()=>{if(!navigator.onLine){$("#cloudStatus").textContent="⚠ Offline — file tetap aman di lokal.";return}$("#cloudStatus").textContent="Sinkronisasi berjalan...";await syncPending();$("#cloudStatus").textContent="✓ Sinkronisasi selesai. File tetap tersimpan di lokal.";refreshHome();renderFiles()};
function updateCloudUI(){const mode=$("#cloudMode")?.value||"local";const online=navigator.onLine;$("#cloudStatus").textContent=mode==="local"?"💾 Lokal saja — tidak ada upload otomatis.":(online?"☁ Lokal + Cloud — sinkron saat online.":"📴 Offline — file masuk antrean dan akan disinkronkan saat online.");$("#syncNow").disabled=mode!=="local_cloud"||!online}
$("#saveGas").onclick=async()=>{const url=$("#gasUrl").value.trim();if(!/^https:\/\/script\.google\.com\/macros\/s\/.*\/exec$/.test(url)){return $("#gasStatus").textContent="URL GAS tidak valid. Gunakan URL Web App yang berakhiran /exec."}await setCfg("gasUrl",url);$("#gasStatus").textContent="✓ URL GAS tersimpan di perangkat."};
$("#testGas").onclick=async()=>{const url=await cfg("gasUrl",DEFAULT_GAS_URL);$("#gasStatus").textContent="Menguji koneksi...";try{const r=await fetch(url,{method:"GET",cache:"no-store"});const out=await r.json();$("#gasStatus").textContent=out.ok?"✓ GAS terhubung: "+out.service:"⚠ Backend merespons tetapi status tidak OK."}catch(e){$("#gasStatus").textContent="⚠ Tidak dapat terhubung ke GAS: "+e.message}};
$("#clearLocal").onclick=async()=>{if(!confirm("Hapus semua hasil kompres lokal dan antrean sinkronisasi?"))return;for(const x of await all())await del(x.id);for(const q of await queueAll())await queueDel(q.id);renderFiles();refreshHome()};
async function updateStorage(){if(navigator.storage?.estimate){const s=await navigator.storage.estimate();$("#storage").textContent=`${fmt(s.usage||0)} / ${fmt(s.quota||0)}`}}
function fmt(n){if(!n)return"0 B";const u=["B","KB","MB","GB"],i=Math.floor(Math.log(n)/Math.log(1024));return`${(n/1024**i).toFixed(i?1:0)} ${u[i]}`}
function base(n){return n.replace(/\.[^.]+$/,"").replace(/[^\w-]+/g,"_").slice(0,60)||"media"}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
window.downloadItem=downloadItem;window.deleteItem=deleteItem;window.uploadItemById=uploadItemById;
window.addEventListener("online",async()=>{$("#net").textContent="ONLINE";updateCloudUI();if(await cfg("autoRetry",true)&&await cloudEnabled())await syncPending();refreshHome()});
window.addEventListener("offline",()=>{$("#net").textContent="OFFLINE";updateCloudUI();refreshHome()});
const drop=$("#drop"); if(drop){["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("drag")}));
["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("drag")}));
drop.addEventListener("drop",e=>{const f=e.dataTransfer.files?.[0];if(!f)return;const dt=new DataTransfer();dt.items.add(f);$("#fileInput").files=dt.files;$("#fileInput").dispatchEvent(new Event("change",{bubbles:true}))})}

$("#preset").onchange=()=>{if(currentFile){const k=$("#preset").value;$("#estimate").classList.remove("hidden");$("#estimate").textContent=`Estimasi hasil: ~${fmt(compressionEstimate(currentFile.size,currentKind,k))}`}};
["imageDefault","videoDefault","speedDefault"].forEach(id=>$("#"+id).onchange=async()=>{await setCfg(id,$("#"+id).value);if(id==="speedDefault"){const v=$("#speedDefault").value;$("#imageDefault").value=v;$("#videoDefault").value=v;await setCfg("imageDefault",v);await setCfg("videoDefault",v)}});
$("#preset").onchange=()=>{if(currentFile){const k=$("#preset").value;$("#estimate").classList.remove("hidden");$("#estimate").textContent=`Estimasi hasil: ~${fmt(compressionEstimate(currentFile.size,currentKind,k))}`}};
$$("#socialPlatforms .platform").forEach(b=>b.onclick=()=>setSocialPlatform(b.dataset.platform));
$("#socialImageBtn").onclick=()=>setSocialKind("image");
$("#socialVideoBtn").onclick=()=>setSocialKind("video");
$("#socialPreset").onchange=()=>{socialPresetKey=$("#socialPreset").value;updateSocialSpec()};
$("#socialFileInput").onchange=e=>loadSocialFile(e.target.files[0]);
$("#socialCompressBtn").onclick=processSocial;
const socialDrop=$("#socialDrop");
if(socialDrop){["dragenter","dragover"].forEach(ev=>socialDrop.addEventListener(ev,e=>{e.preventDefault();socialDrop.classList.add("drag")}));
["dragleave","drop"].forEach(ev=>socialDrop.addEventListener(ev,e=>{e.preventDefault();socialDrop.classList.remove("drag")}));
socialDrop.addEventListener("drop",e=>{const f=e.dataTransfer.files?.[0];if(f)loadSocialFile(f)})}

openDB().then(async()=>{if(!(await cfg("gasUrl","")))await setCfg("gasUrl",DEFAULT_GAS_URL);if(!(await cfg("cloudMode","")))await setCfg("cloudMode","local");if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");$("#net").textContent=navigator.onLine?"ONLINE":"OFFLINE";go("home")});
