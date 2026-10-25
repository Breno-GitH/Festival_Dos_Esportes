/* Small boxing resources; normal strikes, dodges and feints use the same gate for both boxers. */
const BOXING_STAMINA=Object.freeze({max:100,jab:5,cross:13,dodge:14,feint:4,parry:3,regen:.60,guardRegen:.18,regenDelay:12});
function boxingSpendStamina(f,kind){
    const cost=f.role==='master'&&kind==='jab'?MASTER_IRON_CONFIG.jabCost:f.role==='master'&&kind==='cross'?MASTER_IRON_CONFIG.crossCost:BOXING_STAMINA[kind]||0;
    if(f.stamina+1e-6<cost){
        if(!f.staminaNotice){boxingAddEffect(f.x,f.y-56,'SEM FÔLEGO','#c0d5e0');f.staminaNotice=42;}
        return false;
    }
    f.stamina=Math.max(0,f.stamina-cost);f.staminaDelay=BOXING_STAMINA.regenDelay;return true;
}
function boxingUpdateStamina(f){
    if(f.staminaNotice)f.staminaNotice--;if(f.staminaDelay)f.staminaDelay--;
    if(!f.staminaDelay&&!f.whiffFrames&&!f.attack&&!boxingBusySpecial(f)&&!f.dodgeFrames&&!f.feint&&!f.hitstun&&!f.guardBreakTimer&&!f.parryFrames&&!f.parryStun&&!f.parryRecovery&&!f.counterStance&&!f.slip)
        f.stamina=Math.min(f.maxStamina,f.stamina+(f.guard?BOXING_STAMINA.guardRegen:BOXING_STAMINA.regen));
}
function boxingStartFeint(f,target){
    if(!boxingCanAct(f)||boxingBusySpecial(f)||f.feint||f.feintCooldown)return false;
    const a=f.attack;
    if(a&&(a.kind!=='cross'||a.landed||a.frame>=BOXING_CONFIG.feint.cancelFrames||a.frame>=boxingAttackStartup(a,boxingAttackSpec(a))-2))return false;
    if(!boxingSpendStamina(f,'feint'))return false;
    boxingFaceOpponent(f,target);
    boxingSpecialController(f)?.onAttackEnded?.(f,a,'FEINT');
    f.attack=null;f.feint={age:0,frame:a?.frame||0,initialFrame:a?.frame||0,kind:'cross',startup:12,facing:f.facing,originY:f.y,landed:false,dodged:false};
    f.feintCooldown=BOXING_CONFIG.feint.cooldown;f.guard=false;f.bufferedAttack=null;f.bufferFrames=0;f.comboCount=0;f.comboTimer=0;
    f.animation='hook';f.state='feint';f.stateFrame=0;boxingShowEvent('feint',f);return true;
}
function boxingUpdateFeint(f){
    const fake=f.feint;fake.age++;fake.frame=fake.initialFrame+fake.age;
    f.animation=fake.age<BOXING_CONFIG.feint.threatFrames?'hook':'idle';f.state='feint';f.stateFrame=Math.min(fake.age,4);
    if(fake.age>=BOXING_CONFIG.feint.duration){f.feint=null;boxingSetAnimation(f,'idle');}
}
