import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'lil-gui'
import { WebGLRenderTarget } from 'three';

let mouseX : number, mouseY : number;
let mouseDown = false;
let mouse = new THREE.Vector3(0,0,1);
let canvFrame : HTMLElement = document.getElementById('frame') as HTMLElement;
let canvas : HTMLCanvasElement = document.getElementById('myCanvas') as HTMLCanvasElement;
canvas.width = window.innerWidth * 0.7;
canvas.height = window.innerHeight * 0.7;
let canvasWidth = canvas.width;
let canvasHeight = canvas.height;
let blankTextureData = new Uint8Array(canvasWidth * canvasHeight);
let initTex = new THREE.DataTexture(blankTextureData,canvasWidth,canvasHeight,THREE.LuminanceFormat,THREE.UnsignedByteType);
initTex.magFilter = THREE.NearestFilter;
initTex.needsUpdate = true;
let initTex2 = new THREE.Texture().copy(initTex);

let scene = new THREE.Scene();

let camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10000, 10000);
camera.position.z = 100;
let renderer = new THREE.WebGLRenderer({canvas: canvas, preserveDrawingBuffer: true});
renderer.setSize(canvasWidth,canvasHeight);

//canvas.appendChild(renderer.domElement);

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
texture.minFilter = THREE.NearestFilter;
texture.magFilter = THREE.NearestFilter;
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;

let uniforms = {
    iTime: { value: 0 },
    iResolution:  { value: new THREE.Vector3(1, 1, 1) },
    mousePos: { value: new THREE.Vector2() },
    inkColor: { value: new THREE.Vector4(1,1,1,1)},
    screenWidth: {value: canvasWidth},
    screenHeight: {value: canvasHeight},
    tSource: {type: "t", value: initTex as THREE.Texture},
    mDown: {type: "b", value: false},    
};


const sizes = {
    width: canvasWidth,
    height: canvasHeight
};

let onMouseMove = function(e: MouseEvent)
{
    mouseX = e.pageX
    mouseY = e.pageY

    if(mouseDown)
        uniforms.iResolution.value.x = mouseX/canvasWidth;
        uniforms.iResolution.value.y = 1-mouseY/canvasHeight;
}

let onMouseDown = function(e: MouseEvent)
{
    mouse.x = e.pageX - canvas.offsetLeft;
    mouse.y = e.pageY - canvas.offsetTop;
    mouseDown = true;
    uniforms.mDown.value = true;

    uniforms.mousePos.value.x = mouseX/canvasWidth;
    uniforms.mousePos.value.y = (1-mouseY)/canvasHeight;
}

let onMouseUp = function(e: Event)
{
    mouseDown = false;
    uniforms.mDown.value = false;
}

function handleMouseMove(event: MouseEvent) {
    mouse.x = event.pageX - canvas.offsetLeft;
    mouse.y = event.pageY - canvas.offsetTop;
    mouse.z = 1;

    if(mouseDown){
        uniforms.mousePos.value.x = mouse.x/canvasWidth;
        uniforms.mousePos.value.y = 1 - (mouse.y/canvasHeight);
        console.log(uniforms.mousePos.value);
    }
}

canvas.onmousedown = onMouseDown;
canvas.onmouseup = onMouseUp;
canvas.onmousemove = onMouseMove;

canvas.addEventListener("mousemove", handleMouseMove);

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

const paperObj = new THREE.Mesh(paper, shaderMat2);

const cube = new THREE.Mesh(geometry, shaderMat);
bufferScene.add(cube)
scene.add(paperObj);

const colorSet = { 
    red: new THREE.Vector4(1,0,0,1),
    green: new THREE.Vector4(0,1,0,1),
    blue: new THREE.Vector4(0,0,1,1),
};
const curColor = {Color: new THREE.Vector4(1,0,0,1)};

let guiElement : HTMLElement = document.getElementById('gui') as HTMLElement;

const gui = new GUI({width: 300, container: guiElement })
//gui.domElement.id = 'gui';
const colorFolder = gui.addFolder('Color')
colorFolder.add(curColor,'Color',colorSet);
canvFrame.appendChild(guiElement);

let screenToggle = false;

let initTime = Date.now();

function render() {
    requestAnimationFrame( render );
    uniforms.inkColor.value = curColor.Color;
    uniforms.iTime.value = (Date.now() - initTime)/1000;
    // Render onto our off-screen texture
    if(screenToggle){
        uniforms.tSource.value = Texture1.texture;
        renderer.setClearColor("rgb(0, 0, 0)");
        renderer.setRenderTarget(Texture2);
        renderer.render(bufferScene, camera);
        uniforms.tSource.value = Texture2.texture;
    } else {
        // Finally, draw to the screen
        uniforms.tSource.value = Texture2.texture;
        renderer.setClearColor("rgb(0, 0, 0)");
        renderer.setRenderTarget(Texture1);
        renderer.render( scene, camera );
        uniforms.tSource.value = Texture1.texture;
    }
    screenToggle = !screenToggle;
    renderer.setClearColor("rgb(150, 150, 150)");
    renderer.setRenderTarget(null);
    renderer.render( scene, camera );
    initTime = Date.now();
}
 
render()

// let uniforms = {
//     screenWidth: {type: "f", value: 0},
//     screenHeight: {type: "f", value: 0},
//     tSource: {type: "t", value: new WebGLRenderTarget(1,1)},
//     dt: {type: "f", value: 1.0},
//     brush: {type: "v2", value: new THREE.Vector2(-10, -10)},
//     color1: {type: "v4", value: new THREE.Vector4(0, 0, 0.0, 0)},
//     color2: {type: "v4", value: new THREE.Vector4(0, 1, 0, 0.2)},
//     color3: {type: "v4", value: new THREE.Vector4(1, 1, 0, 0.21)},
//     color4: {type: "v4", value: new THREE.Vector4(1, 0, 0, 0.4)},
//     color5: {type: "v4", value: new THREE.Vector4(1, 1, 1, 0.6)}
// };

// let mTexture1 = new THREE.WebGLRenderTarget(canvasWidth/2, canvasHeight/2,
//     {minFilter: THREE.LinearFilter,
//      magFilter: THREE.LinearFilter,
//      format: THREE.RGBAFormat,
//      type: THREE.FloatType});

// let mTexture2 = new THREE.WebGLRenderTarget(canvasWidth/2, canvasHeight/2,
//     {minFilter: THREE.LinearFilter,
//      magFilter: THREE.LinearFilter,
//      format: THREE.RGBAFormat,
//      type: THREE.FloatType});

// mTexture1.wrapS = THREE.RepeatWrapping;
// mTexture1.wrapT = THREE.RepeatWrapping;
// mTexture2.wrapS = THREE.RepeatWrapping;
// mTexture2.wrapT = THREE.RepeatWrapping;

// uniforms.screenWidth.value = canvasWidth/2;
// uniforms.screenHeight.value = canvasHeight/2;

// let vertShader : HTMLElement | null = document.getElementById('vertex-shader')
// let fragShader : HTMLElement | null = document.getElementById('fragment-shader')

// let vertShaderText : string | null = "";
// if(vertShader) {
//     vertShaderText = vertShader.textContent;
// }

// let fragShaderText : string | null = "";
// if(fragShader) {
//     fragShaderText = fragShader.textContent;
// }

// // let shaderMat = new THREE.ShaderMaterial({
// //     uniforms: uniforms,
// //     vertexShader: vertShaderText ? vertShaderText : "",
// //     fragmentShader: fragShaderText ? fragShaderText : "",
// // });

// let onMouseMove = function(e: MouseEvent)
// {
//     mouseX = e.pageX
//     mouseY = e.pageY

//     if(mouseDown)
//         uniforms.brush.value = new THREE.Vector2(mouseX/canvasWidth, 1-mouseY/canvasHeight);
// }

// let onMouseDown = function(e: Event)
// {
//     var ev = e ? e : window.event;
//     mouseDown = true;

//     uniforms.brush.value = new THREE.Vector2(mouseX/canvasWidth, 1-mouseY/canvasHeight);
// }

// let onMouseUp = function(e: Event)
// {
//     mouseDown = false;
// }

// const scene = new THREE.Scene()
// let mouse = new THREE.Vector3(0,0,1);
// const sizes = {
//     width: window.innerWidth,
//     height: window.innerHeight
// };

// const camera = new THREE.PerspectiveCamera(
//     75,
//     window.innerWidth / window.innerHeight,
//     0.1,
//     1000
// )
// camera.position.z = 2

// const renderer = new THREE.WebGLRenderer({canvas: canvas, preserveDrawingBuffer: true});
// renderer.setSize(canvasWidth, canvasHeight)
// //document.body.appendChild(renderer.domElement)

// const geometry = new THREE.BoxGeometry()
// const paper = new THREE.PlaneGeometry(1,1)
// const material = new THREE.MeshBasicMaterial({
//     color: 0x00ff00,
//     wireframe: true,
// })
// const paperMat = new THREE.MeshBasicMaterial({
//     color: 0xffffff,
//     side: THREE.DoubleSide
// })

// const paperObj = new THREE.Mesh(paper, paperMat);

// const cube = new THREE.Mesh(geometry, material)
// scene.add(cube)
// scene.add(paperObj);

// function handleMouseMove(event: MouseEvent) {
//     mouse.x = (event.clientX / sizes.width) * 2 - 1;
//     mouse.y = -(event.clientY / sizes.height) * 2 + 1;
//     mouse.z = 1;

//     // convert screen coordinates to threejs world position
//     // https://stackoverflow.com/questions/13055214/mouse-canvas-x-y-to-three-js-world-x-y-z

//     var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
//     vector.unproject(camera);
//     var dir = vector.sub(camera.position).normalize();
//     var distance = -camera.position.z / dir.z;
//     var pos = camera.position.clone().add(dir.multiplyScalar(distance));

//     mouse = pos;

//     //console.log(mouse);
// }

// // window.addEventListener('resize', onWindowResize, false)
// // function onWindowResize() {
// //     camera.aspect = window.innerWidth / window.innerHeight
// //     camera.updateProjectionMatrix()
// //     renderer.setSize(window.innerWidth, window.innerHeight)
// //     render()
// // }

// window.onmousedown = onMouseDown;
// window.onmouseup = onMouseUp;
// window.onmousemove = onMouseMove;

// window.addEventListener("mousemove", handleMouseMove);

// const stats = Stats()
// canvFrame.appendChild(stats.dom)

// const gui = new GUI({autoPlace: false, container: canvFrame})
// gui.domElement.id = 'gui';
// const cubeFolder = gui.addFolder('Cube')
// cubeFolder.add(cube.rotation, 'x', 0, Math.PI * 2)
// cubeFolder.add(cube.rotation, 'y', 0, Math.PI * 2)
// cubeFolder.add(cube.rotation, 'z', 0, Math.PI * 2)
// cubeFolder.open()
// const cameraFolder = gui.addFolder('Camera')
// cameraFolder.add(camera.position, 'z', 0, 10)
// cameraFolder.open()

// function animate() {
//     requestAnimationFrame(animate)

//     cube.rotation.x += 0.01
//     cube.rotation.y += 0.01

//     // uniforms.tSource.value = mTexture2;
//     // renderer.setRenderTarget(mTexture1);
//     // renderer.render(scene, camera);
//     //uniforms.tSource.value = mTexture1;

//     //paperObj.position.copy(mouse);

//     render()

//     stats.update()
// }

// function render() {
//     renderer.render(scene, camera)
// }

// animate()