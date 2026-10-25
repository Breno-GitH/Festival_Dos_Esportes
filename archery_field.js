/* Native world dimensions. Only Archery changes canvas resolution. No scene zoom. */
(function(global){
    'use strict';
    const WIDTH=900,HEIGHT=480,SOURCE_LIP=130,SOURCE_BOTTOM=270;
    const player=Object.freeze({left:48,right:852,front:432,back:458});
    const master=Object.freeze({left:48,right:852,front:312,back:332});
    const bands=Object.freeze({
        NEAR:Object.freeze({waterY:246,kind:'NORMAL_LARGE',speed:'SLOW'}),
        MID:Object.freeze({waterY:206,kind:'NORMAL_MEDIUM',speed:'MEDIUM'}),
        FAR:Object.freeze({waterY:166,kind:'NORMAL_SMALL',speed:'FAST'})
    });
    function syncCanvas(canvas,scene){
        const wide=scene==='JOGO_ARCO',w=wide?WIDTH:450,h=wide?HEIGHT:300;
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;canvas.getContext('2d').imageSmoothingEnabled=false;}
    }
    let transition=null;
    function transitionFrame(source){
        if(!transition){transition=global.document.createElement('canvas');transition.width=450;transition.height=300;}
        const g=transition.getContext('2d'),s=Math.min(450/source.width,300/source.height),w=source.width*s,h=source.height*s;
        g.imageSmoothingEnabled=false;g.fillStyle='#040a17';g.fillRect(0,0,450,300);
        g.drawImage(source,Math.round((450-w)/2),Math.round((300-h)/2),w,h);return transition;
    }
    global.ArcheryField=Object.freeze({WIDTH,HEIGHT,SOURCE_LIP,SOURCE_BOTTOM,player,master,bands,syncCanvas,transitionFrame,
        camera:'FIXED_FULL_FIELD',start:Object.freeze({playerX:220,playerY:448,masterX:680,masterY:326})});
})(window);
