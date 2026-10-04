const COLORS=["red","blue","green","yellow"];
const NAMES=["Red Command","Blue Command","Green Command","Yellow Command"];
const ICONS=["⚔","🪖","🛡","🐎"];

// A simple 52-square loop laid over a 15x15 board.
// Coordinates are deliberately generated so the game remains easy to extend.
const path=[
 [6,0],[7,0],[8,0],[8,1],[8,2],[9,2],[10,2],[11,2],[12,2],[12,3],[12,4],
 [14,6],[13,6],[12,6],[12,7],[12,8],[13,8],[14,8],[14,9],[14,10],[14,11],[14,12],
 [13,12],[12,12],[12,13],[12,14],[11,14],[10,14],[9,14],[8,14],[8,13],[8,12],
 [7,12],[6,12],[6,13],[6,14],[5,14],[4,14],[3,14],[2,14],[2,13],[2,12],
 [1,12],[0,12],[0,11],[0,10],[0,9],[0,8],[1,8],[2,8],[2,7],[2,6]
];

const starts=[0,13,26,39];
const safe=new Set([0,8,13,21,26,34,39,47]);
const state={
 turn:0,dice:null,rolling:false,winner:null,
 players:COLORS.map((color)=>({color,pieces:[-1,-1,-1,-1]}))
};

const board=document.querySelector("#board");
const rollBtn=document.querySelector("#rollBtn");
const msg=document.querySelector("#message");
const turnLabel=document.querySelector("#turnLabel");
const diceValue=document.querySelector("#diceValue");

function makeBoard(){
  board.innerHTML="";
  for(let r=0;r<15;r++){
    for(let c=0;c<15;c++){
      const el=document.createElement("div");
      el.className="cell";
      if(r<6&&c<6) el.classList.add("home","red");
      else if(r<6&&c>8) el.classList.add("home","blue");
      else if(r>8&&c<6) el.classList.add("home","green");
      else if(r>8&&c>8) el.classList.add("home","yellow");
      else if(r>=6&&r<=8&&c>=6&&c<=8) el.classList.add("center");
      else el.classList.add("track");
      board.appendChild(el);
    }
  }
  render();
}

function cellAt(index){
  const [r,c]=path[index%52];
  return board.children[r*15+c];
}
function absPos(player, progress){
  if(progress<0)return null;
  return (starts[player]+progress)%52;
}
function canMove(player,piece,dice){
  const p=state.players[player].pieces[piece];
  if(p===-1)return dice===6;
  return p+dice<=57;
}
function legalPieces(){
  if(state.dice===null)return [];
  return state.players[state.turn].pieces.map((_,i)=>i).filter(i=>canMove(state.turn,i,state.dice));
}
function render(){
  document.querySelectorAll(".piece").forEach(x=>x.remove());
  for(let p=0;p<4;p++){
    state.players[p].pieces.forEach((progress,i)=>{
      const piece=document.createElement("div");
      piece.className=`piece ${COLORS[p]}`;
      piece.title=`${NAMES[p]} Soldier ${i+1}`;
      piece.innerHTML=`<span class="soldier">${ICONS[i]}</span>`;
      const absolute=absPos(p,progress);
      let host;
      if(absolute===null){
        // Barracks represented by the four corner home areas.
        const offsets=[[1,1],[1,4],[4,1],[4,4]];
        const base= p===0?[0,0]:p===1?[0,9]:p===2?[9,0]:[9,9];
        host=board.children[(base[0]+offsets[i][0])*15+(base[1]+offsets[i][1])];
      }else if(progress>=52){
        // Finished soldiers sit around their HQ center.
        host=board.children[(7+Math.round((i-1.5)*0.9))*15+(7+Math.round((i-1.5)*0.9))];
      }else host=cellAt(absolute);
      host.appendChild(piece);
      if(p===state.turn && legalPieces().includes(i)){
        piece.classList.add("legal");
        piece.onclick=()=>movePiece(i);
      }
    });
  }
  updateSidePanels();
  turnLabel.textContent=state.winner!==null?`${NAMES[state.winner]} WINS!`:NAMES[state.turn];
  diceValue.textContent=state.dice??"—";
  rollBtn.disabled=state.rolling||state.winner!==null||state.dice!==null;
}
function updateSidePanels(){
  state.players.forEach((pl,i)=>{
    const el=document.querySelector(`#${COLORS[i]}Pieces`);
    el.innerHTML=pl.pieces.map((v,n)=>`<span class="mini">${ICONS[n]} ${v<0?"HOME":v>=52?"HQ":v+1}</span>`).join("");
  });
}
function roll(){
  if(rollBtn.disabled)return;
  state.rolling=true; render();
  let ticks=0;
  const timer=setInterval(()=>{
    diceValue.textContent=1+Math.floor(Math.random()*6);
    if(++ticks>=8){
      clearInterval(timer);
      state.dice=1+Math.floor(Math.random()*6);
      state.rolling=false;
      const legal=legalPieces();
      if(!legal.length){
        msg.textContent=`No legal move. ${state.dice===6?"":"Turn passes."}`;
        if(state.dice!==6)setTimeout(nextTurn,700); else {state.dice=null;render();}
      }else{
        msg.textContent=state.dice===6?"Six! Deploy or move a soldier.":"Choose a highlighted soldier.";
        render();
      }
    }
  },75);
}
function movePiece(i){
  const d=state.dice,p=state.players[state.turn],old=p.pieces[i];
  if(!canMove(state.turn,i,d))return;
  p.pieces[i]=old===-1?0:old+d;
  if(p.pieces[i]>=52){
    p.pieces[i]=52;
    msg.textContent=`${NAMES[state.turn]} soldier reached HQ!`;
  }else{
    const landed=absPos(state.turn,p.pieces[i]);
    if(!safe.has(landed)) captureAt(landed,state.turn);
    msg.textContent=`${NAMES[state.turn]} advances ${d} squares.`;
  }
  state.dice=null;
  if(p.pieces.every(x=>x===52)){
    state.winner=state.turn;
    msg.textContent=`🏆 ${NAMES[state.turn]} captured the board and wins!`;
    render(); return;
  }
  const rolledSix=d===6;
  render();
  if(rolledSix){msg.textContent+=" Roll again."; }
  else setTimeout(nextTurn,450);
}
function captureAt(absolute,attacker){
  for(let p=0;p<4;p++){
    if(p===attacker)continue;
    state.players[p].pieces.forEach((v,i)=>{
      if(v>=0&&v<52&&absPos(p,v)===absolute){
        state.players[p].pieces[i]=-1;
        msg.textContent=`⚔ ${NAMES[attacker]} defeated an opposing soldier!`;
      }
    });
  }
}
function nextTurn(){
  state.turn=(state.turn+1)%4;
  state.dice=null;
  render();
  // Simple AI for the three non-human armies.
  if(state.turn!==0)setTimeout(aiTurn,500);
}
function aiTurn(){
  if(state.winner!==null)return;
  roll();
  setTimeout(()=>{
    if(state.turn!==0 && state.dice!==null){
      const legal=legalPieces();
      if(legal.length) movePiece(legal[Math.floor(Math.random()*legal.length)]);
    }
  },850);
}
function newGame(){
  state.turn=0;state.dice=null;state.rolling=false;state.winner=null;
  state.players.forEach(p=>p.pieces=[-1,-1,-1,-1]);
  msg.textContent="Roll the dice to begin.";
  render();
}
rollBtn.onclick=roll;
document.querySelector("#newGameBtn").onclick=newGame;
makeBoard();
