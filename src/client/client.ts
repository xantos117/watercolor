import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'lil-gui'
import { WebGLRenderTarget } from 'three';

let mouseX : number, mouseY : number;
let mouseDown = false;
let mouse = new THREE.Vector3(0,0,1);
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
let blankTextureData = new Float32Array(4*canvasWidth*canvasHeight);
blankTextureData.forEach(() => Math.random());
let initTex = new THREE.DataTexture(blankTextureData,canvasWidth,canvasHeight,THREE.RGBAFormat,THREE.FloatType);
initTex.internalFormat = 'RGBA32F';
initTex.magFilter = THREE.NearestFilter;
initTex.needsUpdate = true;
let initTex2 = new THREE.Texture().copy(initTex);
let isInked = false;

let scene = new THREE.Scene();

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

let StVecs1 = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType});
let DiagVecs1 = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType});
let OtherVecs1 = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType});

let waterAndBoundary1 = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType});

let redLayer1 = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType});

let StVecs2 = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType});
let DiagVecs2 = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType});
let OtherVecs2 = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType}); 

let waterAndBoundary2 = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType});
let redLayer2 = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType});

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

const loader = new THREE.TextureLoader();
const texture = loader.load('https://threejsfundamentals.org/threejs/resources/images/bayer.png');
let PaperTexture = loader.load('paper_texture_transparent.png');
texture.minFilter = THREE.NearestFilter;
texture.magFilter = THREE.NearestFilter;
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
PaperTexture.minFilter = THREE.NearestFilter;
PaperTexture.magFilter = THREE.NearestFilter;
PaperTexture.wrapS = THREE.RepeatWrapping;
PaperTexture.wrapT = THREE.RepeatWrapping;

let uniforms = {
    iTime: { value: 0 },
    iResolution:  { value: new THREE.Vector3(1, 1, 1) },
    mousePos: { value: new THREE.Vector2() },
    inkColor: { value: new THREE.Vector4(1,1,1,1)},
    screenWidth: {value: canvasWidth},
    screenHeight: {value: canvasHeight},
    stVecs: {type: "t", value: initTex as THREE.Texture},
    diagVecs: {type: "t", value: initTex as THREE.Texture},
    otherVecs: {type: "t", value: initTex as THREE.Texture},
    reboundTexture: {type: "t", value: initTex as THREE.Texture},
    pigmentTexture1: {type: "t", value: initTex as THREE.Texture},
    paperTexture: {type: "t", value: PaperTexture},
    shaderStage: {value: 0},
    mDown: {type: "b", value: false}, 
    omg: {value: 0.9},
    rho0: {value: 1.0},
    c: {value: 1.0},
    ink: {value: false},
};


const sizes = {
    width: canvasWidth,
    height: canvasHeight
};

let sliderPos = window.innerWidth / 2;
let slider = document.querySelector( '.slider' ) as HTMLElement;
function initSlider() {


    function onPointerDown(e: PointerEvent) {

        if ( e.isPrimary === false ) return;

        //controls.enabled = false;

        window.addEventListener( 'pointermove', onPointerMove );
        window.addEventListener( 'pointerup', onPointerUp );

    }

    function onPointerUp(e: PointerEvent) {

        //controls.enabled = true;

        window.removeEventListener( 'pointermove', onPointerMove );
        window.removeEventListener( 'pointerup', onPointerUp );

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

function doMouseMove(event: MouseEvent)
{
    mouse.x = event.pageX
    mouse.y = event.pageY
    mouse.z = 1;

    if(mouseDown) {
        uniforms.mousePos.value.x = mouse.x/canvasWidth;
        uniforms.mousePos.value.y = 1-mouse.y/canvasHeight;
    }
}

function doMouseDown(event: MouseEvent)
{
    mouse.x = event.pageX;
    mouse.y = event.pageY;
    mouse.z = 1;
    mouseDown = true;
    //uniforms.mDown.value = true;
    if(!isInked){
        isInked = true;
        uniforms.ink.value = true;
    }

    uniforms.mousePos.value.x = mouse.x/canvasWidth;
    uniforms.mousePos.value.y = 1-mouse.y/canvasHeight;
}

function onMouseUp(event: Event)
{
    mouseDown = false;
    //uniforms.mDown.value = false;
}

function handleMouseMove(event: MouseEvent) {
    mouse.x = event.pageX;
    mouse.y = event.pageY;
    mouse.z = 1;

    if(mouseDown){
        uniforms.mousePos.value.x = mouse.x/canvasWidth;
        uniforms.mousePos.value.y = 1 - (mouse.y/canvasHeight);
        console.log(uniforms.mousePos.value);
    }
}

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    renderer.setSize( window.innerWidth, window.innerHeight );
}

// window.onmousedown = onMouseDown;
// window.onmouseup = onMouseUp;
// window.onmousemove = onMouseMove;

window.addEventListener("mousemove", doMouseMove);
window.addEventListener("mousedown",doMouseDown);
window.addEventListener("mouseup",onMouseUp);
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
});

paperMat.map = bufferTexture.texture;
paperMat.map.wrapS = THREE.RepeatWrapping;
paperMat.map.wrapT = THREE.RepeatWrapping;

const paperObj = new THREE.Mesh(geometry, shaderMat2);

const cube = new THREE.Mesh(geometry, shaderMat);

bufferScene.add(cube)
scene.add(paperObj);

const colorSet = { 
    red: new THREE.Vector4(1,0,0,1),
    green: new THREE.Vector4(0,1,0,1),
    blue: new THREE.Vector4(0,0,1,1),
};
const curColor = {Color: new THREE.Vector4(1,0,0,1)};

const renderStages = [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
];

const curStage = {Stage: 6};

const gui = new GUI();
const colorFolder = gui.addFolder('Color');
colorFolder.add(curColor,'Color',colorSet);

const uniformFolder = gui.addFolder('Uniforms');
uniformFolder.add(uniforms.omg,"value",0.5,1.5).name('Omega');
uniformFolder.add(uniforms.rho0,"value",0.5,1.5).name('rho0');
uniformFolder.add(uniforms.c,"value",0.5,1.5).name('c');
uniformFolder.add(curStage,'Stage',renderStages);
//uniformFolder.add(uniforms.reboundTexture.)


let screenToggle = false;

let initTime = Date.now();

function render() {
    requestAnimationFrame( render );
    uniforms.inkColor.value = curColor.Color;
    uniforms.iTime.value = (Date.now() - initTime)/1000;
    // Render onto our off-screen texture
    uniforms.shaderStage.value = 5;
    renderer.setClearColor("rgb(0, 0, 0)");
    if(mouseDown) {
        uniforms.mDown.value = true;
    }
    if(screenToggle){
        uniforms.stVecs.value = StVecs2.texture;
        uniforms.diagVecs.value = DiagVecs2.texture;
        uniforms.otherVecs.value = OtherVecs1.texture;
        uniforms.reboundTexture.value = waterAndBoundary1.texture;
        uniforms.pigmentTexture1.value = redLayer1.texture;
        renderer.setRenderTarget(waterAndBoundary2);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 0;
        renderer.setRenderTarget(StVecs1);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 1;
        renderer.setRenderTarget(DiagVecs1);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 2;
        renderer.setRenderTarget(OtherVecs2);
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
        renderer.setRenderTarget(redLayer2);
        renderer.render(scene, camera);
        uniforms.stVecs.value = StVecs2.texture;
        uniforms.diagVecs.value = DiagVecs2.texture;
        uniforms.otherVecs.value = OtherVecs2.texture;
    } else {
        uniforms.stVecs.value = StVecs2.texture;
        uniforms.diagVecs.value = DiagVecs2.texture;
        uniforms.otherVecs.value = OtherVecs2.texture;
        uniforms.reboundTexture.value = waterAndBoundary2.texture;
        uniforms.pigmentTexture1.value = redLayer2.texture;
        renderer.setRenderTarget(waterAndBoundary1);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 0;
        renderer.setRenderTarget(StVecs1);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 1;
        renderer.setRenderTarget(DiagVecs1);
        renderer.render(scene, camera);
        uniforms.shaderStage.value = 2;
        renderer.setRenderTarget(OtherVecs1);
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
        renderer.setRenderTarget(redLayer1);
        renderer.render(scene, camera);
        uniforms.stVecs.value = StVecs2.texture;
        uniforms.diagVecs.value = DiagVecs2.texture;
        uniforms.otherVecs.value = OtherVecs1.texture;
    }
    if(!mouseDown) {
        uniforms.mDown.value = false;
    }
    uniforms.shaderStage.value = 7;
    screenToggle = !screenToggle;
    
    renderer.setScissor( sliderPos, 0, window.innerWidth, window.innerHeight );
    renderer.setClearColor("rgb(150, 150, 150)");
    renderer.setRenderTarget(null);
    renderer.render( scene, camera );
    renderer.setScissor( 0, 0, sliderPos, window.innerHeight );
    uniforms.shaderStage.value = curStage.Stage;
    renderer.render( scene, camera );
    initTime = Date.now();
}
 
render()