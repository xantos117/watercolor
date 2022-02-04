import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'lil-gui'
import { WebGLRenderTarget } from 'three';

let mouseX : number, mouseY : number;
let mouseDown = false;
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

let uniforms = {
    screenWidth: {type: "f", value: 0},
    screenHeight: {type: "f", value: 0},
    tSource: {type: "t", value: new WebGLRenderTarget(1,1)},
    dt: {type: "f", value: 1.0},
    brush: {type: "v2", value: new THREE.Vector2(-10, -10)},
    color1: {type: "v4", value: new THREE.Vector4(0, 0, 0.0, 0)},
    color2: {type: "v4", value: new THREE.Vector4(0, 1, 0, 0.2)},
    color3: {type: "v4", value: new THREE.Vector4(1, 1, 0, 0.21)},
    color4: {type: "v4", value: new THREE.Vector4(1, 0, 0, 0.4)},
    color5: {type: "v4", value: new THREE.Vector4(1, 1, 1, 0.6)}
};

let mTexture1 = new THREE.WebGLRenderTarget(canvasWidth/2, canvasHeight/2,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType});

let mTexture2 = new THREE.WebGLRenderTarget(canvasWidth/2, canvasHeight/2,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType});

mTexture1.wrapS = THREE.RepeatWrapping;
mTexture1.wrapT = THREE.RepeatWrapping;
mTexture2.wrapS = THREE.RepeatWrapping;
mTexture2.wrapT = THREE.RepeatWrapping;

uniforms.screenWidth.value = canvasWidth/2;
uniforms.screenHeight.value = canvasHeight/2;

let vertShader : HTMLElement | null = document.getElementById('vertex-shader')
let fragShader : HTMLElement | null = document.getElementById('fragment-shader')

let vertShaderText : string | null = "";
if(vertShader) {
    vertShaderText = vertShader.textContent;
}

let fragShaderText : string | null = "";
if(fragShader) {
    fragShaderText = fragShader.textContent;
}

let shaderMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertShaderText ? vertShaderText : "",
    fragmentShader: fragShaderText ? fragShaderText : "",
});

let onMouseMove = function(e: MouseEvent)
{
    mouseX = e.pageX
    mouseY = e.pageY

    if(mouseDown)
        uniforms.brush.value = new THREE.Vector2(mouseX/canvasWidth, 1-mouseY/canvasHeight);
}

let onMouseDown = function(e: Event)
{
    var ev = e ? e : window.event;
    mouseDown = true;

    uniforms.brush.value = new THREE.Vector2(mouseX/canvasWidth, 1-mouseY/canvasHeight);
}

let onMouseUp = function(e: Event)
{
    mouseDown = false;
}

const scene = new THREE.Scene()
let mouse = new THREE.Vector3(0,0,1);
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.z = 2

const renderer = new THREE.WebGLRenderer({canvas: window, preserveDrawingBuffer: true});
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

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

const paperObj = new THREE.Mesh(paper, shaderMat);

const cube = new THREE.Mesh(geometry, material)
scene.add(cube)
scene.add(paperObj);

function handleMouseMove(event: MouseEvent) {
    mouse.x = (event.clientX / sizes.width) * 2 - 1;
    mouse.y = -(event.clientY / sizes.height) * 2 + 1;
    mouse.z = 1;

    // convert screen coordinates to threejs world position
    // https://stackoverflow.com/questions/13055214/mouse-canvas-x-y-to-three-js-world-x-y-z

    var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);
    var dir = vector.sub(camera.position).normalize();
    var distance = -camera.position.z / dir.z;
    var pos = camera.position.clone().add(dir.multiplyScalar(distance));

    mouse = pos;

    //console.log(mouse);
}

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

window.onmousedown = onMouseDown;
window.onmouseup = onMouseUp;
window.onmousemove = onMouseMove;

window.addEventListener("mousemove", handleMouseMove);

const stats = Stats()
document.body.appendChild(stats.dom)

const gui = new GUI()
const cubeFolder = gui.addFolder('Cube')
cubeFolder.add(cube.rotation, 'x', 0, Math.PI * 2)
cubeFolder.add(cube.rotation, 'y', 0, Math.PI * 2)
cubeFolder.add(cube.rotation, 'z', 0, Math.PI * 2)
cubeFolder.open()
const cameraFolder = gui.addFolder('Camera')
cameraFolder.add(camera.position, 'z', 0, 10)
cameraFolder.open()

function animate() {
    requestAnimationFrame(animate)

    cube.rotation.x += 0.01
    cube.rotation.y += 0.01

    uniforms.tSource.value = mTexture2;
    renderer.setRenderTarget(mTexture1);
    renderer.render(scene, camera);
    //uniforms.tSource.value = mTexture1;

    //paperObj.position.copy(mouse);

    render()

    stats.update()
}

function render() {
    renderer.render(scene, camera)
}

animate()