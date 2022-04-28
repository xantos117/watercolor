import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'lil-gui'
import { Vector3, Vector4, WebGLRenderTarget } from 'three';
import * as quickEx from './quick_example.js'

let Pressure = require('pressure');
let redArray: Array<number> = [];
quickEx.Module['onRuntimeInitialized'] = function() {
      var retVector = quickEx.Module.mixbox_vec_srgb8_to_latent(255, 10, 10);
      for (var i = 0; i < 4; i++) {
          console.log("Vector Value: ", retVector.get(i));
          uniforms.pigCon.value.setComponent(i,retVector.get(i));
      }
      for(var i = 0; i < 3; i++) {
          uniforms.latent.value.setComponent(i,retVector.get(i+4));
      }
    };

let mouseX : number, mouseY : number;
let mouseDown = false;
let mouse = new THREE.Vector3(0,0,1);
let mousePos = new THREE.Vector2();
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
let texcanvasWidth = canvasWidth;
let texcanvasHeight = canvasHeight;
let blankTextureData = new Float32Array(4*canvasWidth*canvasHeight);
blankTextureData.forEach(() => Math.random());
let initTex = new THREE.DataTexture(blankTextureData,canvasWidth,canvasHeight,THREE.RGBAFormat,THREE.FloatType);
initTex.internalFormat = 'RGBA32F';
initTex.magFilter = THREE.NearestFilter;
initTex.needsUpdate = true;
let initTex2 = new THREE.Texture().copy(initTex);
let isInked = false;
let sliderSelected = false;
const stats = Stats()
document.body.appendChild(stats.dom)

let scene = new THREE.Scene();
let initScene = new THREE.Scene();

let camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10000, 10000);
camera.position.z = 100;
let renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
renderer.setSize(canvasWidth,canvasHeight);
renderer.setScissorTest( true );
//document.body.append(renderer.domElement);

const container = document.querySelector( '.container' ) as HTMLElement;
container.appendChild( renderer.domElement );

let sceneL = new THREE.Scene();
sceneL.background = new THREE.Color( 0xBCD48F );

// sceneR = new THREE.Scene();
// sceneR.background = new THREE.Color( 0x8FBCD4 );

let bufferScene = new THREE.Scene();

let bufferTexture = new THREE.WebGLRenderTarget( 1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});

function createTexture(){
    return new THREE.WebGLRenderTarget(texcanvasWidth, texcanvasHeight,
                                        {minFilter: THREE.LinearFilter,
                                        magFilter: THREE.LinearFilter,
                                        format: THREE.RGBAFormat,
                                        type: THREE.FloatType});
}


let Texture1 = new THREE.WebGLRenderTarget(canvasWidth/2, canvasHeight/2,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType});
let Texture2 = new THREE.WebGLRenderTarget(canvasWidth/2, canvasHeight/2,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType});

// Set 1
let StVecs1 = createTexture();
let DiagVecs1 = createTexture();
let OtherVecs1 = createTexture();
let waterAndBoundary1 = createTexture();
let c1_1 = createTexture();
let c2_1 = createTexture();
let c3_1 = createTexture();
let c4_1 = createTexture();

// Set 2
let StVecs2 = createTexture();
let DiagVecs2 = createTexture();
let OtherVecs2 = createTexture(); 
let waterAndBoundary2 = createTexture();
let c1_2 = createTexture();
let c2_2 = createTexture();
let c3_2 = createTexture();
let c4_2 = createTexture();

console.log(StVecs1.texture.image);

const geometry = new THREE.BoxGeometry()
const paper = new THREE.PlaneGeometry(1,1)
const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
})
const paperMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide
})

let vertShader : HTMLElement | null = document.getElementById('vertex-shader');
let fragShader : HTMLElement | null = document.getElementById('fragment-shader');
let fragScreen : HTMLElement | null = document.getElementById('fragment-screen');

const paperList = [
    'coquille_tex.jpg',
    'paper-1.png',
    'paper-2.png',
    'paper-3.png',
    'paper-fibers.png',
    'paper-grain-texture.jpg',
    'rice-paper.png',
    'rice-paper-2.png',
    'white-paper-texture.jpg',
    'paper-texture.jpg',
];
let paperName = {value: paperList[8]};

const loader = new THREE.TextureLoader();
const texture = loader.load('https://threejsfundamentals.org/threejs/resources/images/bayer.png');
let PaperTexture = loader.load(paperName.value);
texture.minFilter = THREE.NearestFilter;
texture.magFilter = THREE.NearestFilter;
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
PaperTexture.minFilter = THREE.LinearFilter;
PaperTexture.magFilter = THREE.LinearFilter;
PaperTexture.wrapS = THREE.RepeatWrapping;
PaperTexture.wrapT = THREE.RepeatWrapping;

let uniforms = {
    iTime: { value: 0 },
    iResolution:  { value: new THREE.Vector3(1, 1, 1) },
    mousePrior2: { value: new THREE.Vector2() },
    mousePrior: { value: new THREE.Vector2() },
    mousePos: { value: new THREE.Vector2() },
    inkColor: { value: new THREE.Vector4(1,1,1,1)},
    screenWidth: {value: canvasWidth},
    screenHeight: {value: canvasHeight},
    stVecs: {type: "t", value: initTex as THREE.Texture},
    diagVecs: {type: "t", value: initTex as THREE.Texture},
    otherVecs: {type: "t", value: initTex as THREE.Texture},
    reboundTexture: {type: "t", value: initTex as THREE.Texture},
    pigmentTexture1: {type: "t", value: initTex as THREE.Texture},
    pigmentTexture2: {type: "t", value: initTex as THREE.Texture},
    pigmentTexture3: {type: "t", value: initTex as THREE.Texture},
    pigmentTexture4: {type: "t", value: initTex as THREE.Texture},
    paperTexture: {type: "t", value: PaperTexture},
    shaderStage: {value: 0},
    mDown: {type: "b", value: false}, 
    paintTexID: {value: 1},
    omg: {value: 0.7},
    rho0: {value: 1.0},
    c: {value: 1.0},
    alpha: {value: 0.3},
    eta: {value: 0.0005},
    ink: {value: false},
    useMixbox: {value: false},
    tau: {value: 0.5},
    granGam: {value: 0.3},
    theta: {value: 0.01},
    brushRadius: {value: 30.},
    pigCon: {value: new THREE.Vector4() },
    latent: {value: new THREE.Vector3() },
    dv: {value: new THREE.Vector2()},
    K1: {value: new THREE.Vector3()},
    S1: {value: new THREE.Vector3()},
    K2: {value: new THREE.Vector3()},
    S2: {value: new THREE.Vector3()},
};

let maxDist = new THREE.Vector2(canvasWidth,canvasHeight);


const sizes = {
    width: canvasWidth,
    height: canvasHeight
};

let sliderPos = 0;//window.innerWidth / 2;
let slider = document.querySelector( '.deb_slider' ) as HTMLElement;
function initSlider() {


    function onPointerDown(e: PointerEvent) {

        if ( e.isPrimary === false ) return;

        //controls.enabled = false;

        window.addEventListener( 'pointermove', onPointerMove );
        window.addEventListener( 'pointerup', onPointerUp );
        sliderSelected = true;
        mouseDown = false;

    }

    function onPointerUp(e: PointerEvent) {

        //controls.enabled = true;

        window.removeEventListener( 'pointermove', onPointerMove );
        window.removeEventListener( 'pointerup', onPointerUp );
        sliderSelected = false;

    }

    function onPointerMove( e: PointerEvent ) {

        if ( e.isPrimary === false ) return;

        sliderPos = Math.max( 0, Math.min( window.innerWidth, e.pageX ) );

        if(slider){
            slider.style.left = sliderPos - ( slider.offsetWidth / 2 ) + "px";
        }

    }

    if(slider){
        slider.style.touchAction = 'none'; // disable touch scroll
        slider.addEventListener( 'pointerdown', onPointerDown );
    }

}

initSlider();

let pressVal = 0;
let pbrushRadius = {value: 30};

renderer.domElement.className = '.canvas';
Pressure.set(renderer.domElement, {
    change: function(force: number, event: PointerEvent){
        pressVal = force;
        //console.log(force);
        if(usePressure.value){
            pbrushRadius.value = 0.5 * brushRadius.value + brushRadius.value * force;
        }else{
            pbrushRadius.value = brushRadius.value;
        }
    }
});

function doMouseMove(event: PointerEvent)
{
    mouse.x = event.pageX
    mouse.y = event.pageY
    mouse.z = 1;

    if(mouseDown && !sliderSelected) {

        mousePos.x = mouse.x/canvasWidth;
        mousePos.y = 1-mouse.y/canvasHeight;
    }
}

function doMouseDown(event: PointerEvent)
{
    mouse.x = event.pageX;
    mouse.y = event.pageY;
    mouse.z = 1;
    if(!sliderSelected){
        mouseDown = true;
        //uniforms.mDown.value = true;
        if(!isInked){
            isInked = true;
            uniforms.ink.value = true;
        }
        mousePos.x = mouse.x/canvasWidth;
        mousePos.y = 1-mouse.y/canvasHeight;
        uniforms.mousePrior.value.copy(mousePos);
        uniforms.mousePrior2.value.copy(mousePos);
    }
}

function onMouseUp(event: PointerEvent)
{
    mouseDown = false;
    //uniforms.mDown.value = false;
}

function logKey(event: KeyboardEvent){
    console.log(event.code);
    switch(event.code){
        case 'Digit1':
            curStage.Stage = renderStages[1];
            break;
        case 'Digit2':
            curStage.Stage = renderStages[2];
            break;
        case 'Digit3':
            curStage.Stage = renderStages[3];
            break;
        case 'Digit4':
            curStage.Stage = renderStages[4];
            break;
        case 'Digit5':
            curStage.Stage = renderStages[5];
            break;
        case 'Digit6':
            curStage.Stage = renderStages[6];
            break;
        case 'Digit7':
            curStage.Stage = renderStages[7];
            break;
        case 'Digit8':
            curStage.Stage = renderStages[8];
            break;
        case 'Digit9':
            curStage.Stage = renderStages[9];
            break;
        case 'Digit0':
            curStage.Stage = renderStages[0];
            break;
        case 'KeyU':
            curStage.Stage = renderStages[14];
            break;
    }
}

window.addEventListener( 'resize', onWindowResize, false );
window.addEventListener('keydown',logKey);

function onWindowResize() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    maxDist = new THREE.Vector2(canvasWidth,canvasHeight);

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function calculateKS(rw: THREE.Vector3,rb: THREE.Vector3){
    let a = new THREE.Vector3();
    let b = new THREE.Vector3();
    let S = new THREE.Vector3();
    let K = new THREE.Vector3();
    let ls = rw.clone();
    ls.negate();
    a.addVectors(rb,ls);
    a.addScalar(1);
    a.divide(rb);
    a.add(rw);
    a.multiplyScalar(0.5);
    let t = a.clone();
    t.multiply(a);
    t.addScalar(-1);
    b = new THREE.Vector3(Math.sqrt(t.x),Math.sqrt(t.y),Math.sqrt(t.z));
    t = b.clone();
    ls = rw.clone();
    ls.addScalar(-1);
    ls.multiplyScalar(-1);
    t.multiply(ls);
    let t2 = b.clone();
    ls = a.clone();
    ls.sub(rw);
    let ls2 = a.clone();
    ls2.subScalar(1);
    ls.multiply(ls2);
    t2.multiply(b);
    t2.sub(ls);
    t.divide(t2);
    S = new THREE.Vector3(Math.atanh(t.x),Math.atanh(t.y),Math.atanh(t.z));
    S.divide(b);
    K = S.clone();
    K.multiply(a.clone().subScalar(1));
    return {K,S};
}

// window.onmousedown = onMouseDown;
// window.onmouseup = onMouseUp;
// window.onmousemove = onMouseMove;

renderer.domElement.addEventListener("pointermove", doMouseMove);
renderer.domElement.addEventListener("pointerdown",doMouseDown);
renderer.domElement.addEventListener("pointerup",onMouseUp);
// window.addEventListener("mousemove",handleMouseMove);

let vertShaderText : string | null = "";
if(vertShader) {
    vertShaderText = vertShader.textContent;
}

let fragShaderText : string | null = "";
if(fragShader) {
    fragShaderText = fragShader.textContent;
}

let fragScreenText : string | null = "";
if(fragScreen) {
    fragScreenText = fragScreen.textContent;
}

let shaderMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertShaderText ? vertShaderText : "",
    fragmentShader: fragShaderText ? fragShaderText : "",
});

let shaderMat2 = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertShaderText ? vertShaderText : "",
    fragmentShader: fragScreenText ? fragScreenText : "",
    transparent: false,
});

let shaderMat3 = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertShaderText ? vertShaderText : "",
    fragmentShader: fragScreenText ? fragScreenText : "",
    transparent: true,
});

paperMat.map = bufferTexture.texture;
paperMat.map.wrapS = THREE.RepeatWrapping;
paperMat.map.wrapT = THREE.RepeatWrapping;

const paperInitObj = new THREE.Mesh(geometry,shaderMat);

const paperObj1 = new THREE.Mesh(geometry, shaderMat2);
const paperObj2 = new THREE.Mesh(geometry, shaderMat3);

const cube = new THREE.Mesh(geometry, shaderMat);

bufferScene.add(paperObj2);
scene.add(paperObj1);
initScene.add(paperInitObj);

const colorSet = { 
    red: new THREE.Vector4(1,0,0,1),
    green: new THREE.Vector4(0,1,0,1),
    blue: new THREE.Vector4(0,0,1,1),
};
const curColor = {Color: colorSet.red};
const curColorID = {ID: 1};
const colorIDs = [
    0,
    1,
    2,
];
let brushRadius = {value: 30};

const renderStages = [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
];


let mixSwitch = () => {
    colorFolder.domElement.style.display = !uniforms.useMixbox.value ? '' : 'none';
    mcolorFolder.domElement.style.display = uniforms.useMixbox.value ? '' : 'none';
}

const curStage = {Stage: 6};

let usePressure = {value: false};
let useMixbox = {value: false};

const gui = new GUI();
const uniformFolder = gui.addFolder('Uniforms');
const colorFolder = gui.addFolder('Color');
const mcolorFolder = gui.addFolder('Mixbox Color');

colorFolder.add(curColorID,'ID',colorIDs);

uniformFolder.add(uniforms.omg,"value",0,1).name('Omega');
uniformFolder.add(uniforms.rho0,"value",0.5,1.5).name('rho0');
uniformFolder.add(uniforms.eta,"value",0,0.5).name('eta');
uniformFolder.add(uniforms.alpha,"value",0.2,0.5).name('alpha');
uniformFolder.add(uniforms.tau,"value",0,1).name('tau');
uniformFolder.add(uniforms.granGam,"value",0,1).name('Granulation');
uniformFolder.add(uniforms.theta,"value",0,1).name('Theta');
uniformFolder.add(usePressure, "value").name('Pressure');
uniformFolder.add(uniforms.useMixbox, "value").name('Mixbox').onChange(mixSwitch);
uniformFolder.add(curStage,'Stage',renderStages).listen();
uniformFolder.add(brushRadius,"value",1,100).name('Brush Size');

var params = {color1w: "#1861b3",
              color1b: "#175297",
              color2w: "#1861b3",
              color2b: "#175297", };
//var gui = new dat.GUI();
let colorVec = [
    new THREE.Color("#1861b3"),
    new THREE.Color("#1861b3"),
    new THREE.Color("#1861b3"),
    new THREE.Color("#1861b3"),
];

var update = function (paramColor: string, toChange: number, color_a: number, color_b: number, KSInd: number) {
    colorVec[toChange] = new THREE.Color( paramColor );
    var hex = colorVec[toChange].getHexString();
    var css = colorVec[toChange].getStyle();
    var display = "#"+ hex + " or " + css;
    var vec = quickEx.Module.mixbox_vec_srgb32f_to_latent(colorVec[color_a].r,colorVec[color_a].g, colorVec[color_a].b);
    for (var i = 0; i < 4; i++) {
        uniforms.pigCon.value.setComponent(i,vec.get(i));
    }
    for(var i = 0; i < 3; i++) {
        uniforms.latent.value.setComponent(i,vec.get(i+4));
    }
    KS[KSInd] = calculateKS(new THREE.Vector3(colorVec[color_a].r, colorVec[color_a].g, colorVec[color_a].b), new THREE.Vector3(colorVec[color_b].r, colorVec[color_b].g, colorVec[color_b].b));
};

var updatePaper = function() {
    PaperTexture = loader.load(paperName.value);
    uniforms.paperTexture.value = PaperTexture;
}

colorFolder.addColor(params,'color1w').onChange(function () {update(params.color1w,0,0,1,0)}).name("Color1w");
colorFolder.addColor(params,'color1b').onChange(function () {update(params.color1b,1,0,1,0)}).name("Color1b");
colorFolder.addColor(params,'color2w').onChange(function () {update(params.color2w,2,2,3,1)}).name("Color2w");
colorFolder.addColor(params,'color2b').onChange(function () {update(params.color2b,3,2,3,1)}).name("Color2b");
mcolorFolder.addColor(params,'color1w').onChange(function () {update(params.color1w,0,0,1,0)}).name("Color");
gui.add(paperName,'value',paperList).onChange(updatePaper)

let saveObj = {Save: function(){saveAsImage()}};
gui.add(saveObj,'Save').name("Save Image");

mixSwitch();

let latent = {get:function(){ 
                                let vec = quickEx.Module.mixbox_vec_srgb8_to_latent(255,0,0)
                                for (var i = 0; i < vec.size(); i++) {
                                    console.log("Vector Value: ", vec.get(i));
                                    redArray[i] = vec.get(i);
                                }
                                for(var i = 0; i < 3; i++) {
                                    uniforms.latent.value.setComponent(i,vec.get(i+4));
                                }
                            }
            }


let screenToggle = false;

let initTime = Date.now();
let KS = [  calculateKS(new THREE.Vector3(0.1,0.1,0.99), new THREE.Vector3(0.09,0.09,0.8)),
            calculateKS(new THREE.Vector3(0.99,0.99,0.1), new THREE.Vector3(0.4,0.4,0.09))]
//console.log(KS);

// renderer.setRenderTarget(StVecs2);
// renderer.render(initScene, camera);

function render() {
    requestAnimationFrame( render );
    uniforms.inkColor.value = curColor.Color;
    uniforms.iTime.value = (Date.now() - initTime)/1000;
    let maxdv = maxDist.divideScalar(uniforms.iTime.value);
    uniforms.dv.value.copy(maxdv);
    uniforms.mousePos.value.copy(mousePos);
    uniforms.brushRadius.value = pbrushRadius.value;
    //let dv = new THREE.Vector2().addVectors(uniforms.mousePrior.value, uniforms.mousePos.value.).multiplyScalar(1/maxdv);
    //console.log(dv);
    //uniforms.dv.value.copy(dv);
    // Render onto our off-screen texture
    uniforms.K1.value.copy(KS[0].K);
    uniforms.S1.value.copy(KS[0].S);
    uniforms.K2.value.copy(KS[1].K);
    uniforms.S2.value.copy(KS[1].S);
    //Cadmium Yellow
    //uniforms.K2.value = new Vector3(0.10, 0.36, 3.45);
    //uniforms.S2.value = new Vector3(0.97, 0.65, 0.007);
    ////French Ultramarine
    //uniforms.K1.value = new Vector3(0.86, 0.86, 0.06);
    //uniforms.S1.value = new Vector3(0.005, 0.005, 0.09);
    uniforms.paintTexID.value = curColorID.ID;
    
    uniforms.shaderStage.value = 2;
    renderer.setClearColor("rgb(0, 0, 0)");
    if(mouseDown) {
        uniforms.mDown.value = true;
    }
    if(screenToggle){
        uniforms.stVecs.value = StVecs2.texture;
        uniforms.diagVecs.value = DiagVecs2.texture;
        uniforms.otherVecs.value = OtherVecs1.texture;
        uniforms.reboundTexture.value = waterAndBoundary1.texture;
        uniforms.pigmentTexture1.value = c1_1.texture;
        uniforms.pigmentTexture2.value = c2_1.texture;
        uniforms.pigmentTexture3.value = c3_1.texture;
        uniforms.pigmentTexture4.value = c4_1.texture;
        renderer.setRenderTarget(OtherVecs2);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 5;
        renderer.setRenderTarget(waterAndBoundary2);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 0;
        renderer.setRenderTarget(StVecs1);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 1;
        renderer.setRenderTarget(DiagVecs1);
        renderer.render(scene, camera);
        uniforms.stVecs.value = StVecs1.texture;
        uniforms.diagVecs.value = DiagVecs1.texture;
        uniforms.otherVecs.value = OtherVecs2.texture;
        uniforms.shaderStage.value = 3;
        renderer.setRenderTarget(StVecs2);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 4;
        renderer.setRenderTarget(DiagVecs2);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 6;
        renderer.setRenderTarget(c1_2);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 7;
        uniforms.pigmentTexture1.value = c1_2.texture;
        renderer.setRenderTarget(c1_1);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 8;
        renderer.setRenderTarget(c2_2);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 9;
        uniforms.pigmentTexture2.value = c2_2.texture;
        renderer.setRenderTarget(c2_1);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 10;
        renderer.setRenderTarget(c3_2);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 11;
        uniforms.pigmentTexture3.value = c3_2.texture;
        renderer.setRenderTarget(c3_1);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 12;
        renderer.setRenderTarget(c4_2);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 13;
        uniforms.pigmentTexture4.value = c4_2.texture;
        renderer.setRenderTarget(c4_1);
        renderer.render(scene, camera);
        uniforms.stVecs.value = StVecs2.texture;
        uniforms.diagVecs.value = DiagVecs2.texture;
        uniforms.otherVecs.value = OtherVecs2.texture;
        if(mouseDown){
            uniforms.mousePrior2.value.copy(uniforms.mousePrior.value);
            uniforms.mousePrior.value.copy(uniforms.mousePos.value);
        }
    } else {
        uniforms.stVecs.value = StVecs2.texture;
        uniforms.diagVecs.value = DiagVecs2.texture;
        uniforms.otherVecs.value = OtherVecs2.texture;
        uniforms.reboundTexture.value = waterAndBoundary2.texture;
        uniforms.pigmentTexture1.value = c1_1.texture;
        uniforms.pigmentTexture2.value = c2_1.texture;
        uniforms.pigmentTexture3.value = c3_1.texture;
        uniforms.pigmentTexture4.value = c4_1.texture;
        renderer.setRenderTarget(OtherVecs1);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 5;
        renderer.setRenderTarget(waterAndBoundary1);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 0;
        renderer.setRenderTarget(StVecs1);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 1;
        renderer.setRenderTarget(DiagVecs1);
        renderer.render(scene, camera);
        uniforms.stVecs.value = StVecs1.texture;
        uniforms.diagVecs.value = DiagVecs1.texture;
        uniforms.otherVecs.value = OtherVecs1.texture;
        uniforms.shaderStage.value = 3;
        renderer.setRenderTarget(StVecs2);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 4;
        renderer.setRenderTarget(DiagVecs2);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 6;
        renderer.setRenderTarget(c1_2);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 7;
        uniforms.pigmentTexture1.value = c1_2.texture;
        renderer.setRenderTarget(c1_1);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 8;
        renderer.setRenderTarget(c2_2);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 9;
        uniforms.pigmentTexture2.value = c2_2.texture;
        renderer.setRenderTarget(c2_1);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 10;
        renderer.setRenderTarget(c3_2);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 11;
        uniforms.pigmentTexture3.value = c3_2.texture;
        renderer.setRenderTarget(c3_1);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 12;
        renderer.setRenderTarget(c4_2);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 13;
        uniforms.pigmentTexture4.value = c4_2.texture;
        renderer.setRenderTarget(c4_1);
        renderer.render(scene, camera);
        uniforms.stVecs.value = StVecs2.texture;
        uniforms.diagVecs.value = DiagVecs2.texture;
        uniforms.otherVecs.value = OtherVecs1.texture;
        if(mouseDown){
            uniforms.mousePrior2.value.copy(uniforms.mousePrior.value);
            uniforms.mousePrior.value.copy(uniforms.mousePos.value);
        }
    }
    if(!mouseDown) {
        uniforms.mDown.value = false;
    }
    uniforms.shaderStage.value = -1;
    screenToggle = !screenToggle;
    
    renderer.setScissor( sliderPos, 0, window.innerWidth, window.innerHeight );
    renderer.setClearColor("rgb(220, 220, 220)");
    renderer.setRenderTarget(null);
    renderer.render( bufferScene, camera );
    renderer.setScissor( 0, 0, sliderPos, window.innerHeight );
    uniforms.shaderStage.value = curStage.Stage;
    renderer.render( scene, camera );
    initTime = Date.now();
    stats.update();
}
 
render()


// taken from https://codepen.io/shivasaxena/pen/QEzrrv
let strDownloadMime = "image/watercolor-stream";

function saveAsImage() {
    let imgData, imgNode;

    try {
        var strMime = "image/jpeg";
        imgData = renderer.domElement.toDataURL(strMime);

        saveFile(imgData.replace(strMime, strDownloadMime), "test.jpg");

    } catch (e) {
        console.log(e);
        return;
    }

}

var saveFile = function (strData: string, filename: string) {
    var link = document.createElement('a');
    if (typeof link.download === 'string') {
        document.body.appendChild(link); //Firefox requires the link to be in the body
        link.download = filename;
        link.href = strData;
        link.click();
        document.body.removeChild(link); //remove the link when done
    } else {
        //location.replace(uri);
    }
}