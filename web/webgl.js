let cubeRotation = 0.0;

const initialPositions = [];
const numPositions = 3;

const canvas = document.querySelector('#glcanvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

function createInitialPositions() {
    for (let n = 0; n < numPositions; n++) {
        let pos = {};
        pos.initialLon = Math.random() * Math.PI * 2;
        pos.initialLat = -Math.PI * 0.5 + Math.random() * Math.PI;
        pos.initialDirection = Math.random() * Math.PI * 2;
        pos.speed = 5;
        initialPositions.push(pos);
    }
}


let objectPositions = [];
let debugObjectPositions = [];

let maxLat = -10;
let minLat = 10;
let maxLon = -10;
let minLon = 10;
function updatePositions() {

    for (let n = 0; n < numPositions; n++) {

        let pos = initialPositions[n];

        var distanceTraveledRadians = pos.speed * cubeRotation / 5;
        var bearing = pos.initialDirection;

        var lat1 = pos.initialLat; // in radians
        var lon1 = pos.initialLon;

        var sinlat1 = Math.sin(lat1), coslat1 = Math.cos(lat1);
        var sinDistanceTraveledRadians = Math.sin(distanceTraveledRadians);
        var cosDistanceTraveledRadians = Math.cos(distanceTraveledRadians);
        var sinBearing = Math.sin(bearing);
        var cosBearing = Math.cos(bearing);

        var sinlat2 = sinlat1 * cosDistanceTraveledRadians + coslat1 * sinDistanceTraveledRadians * cosBearing;
        var lat2 = Math.asin(sinlat2);
        var y = sinBearing * sinDistanceTraveledRadians * coslat1;
        var x = cosDistanceTraveledRadians - sinlat1 * sinlat2;
        var lon2 = lon1 + Math.atan2(y, x);

        pos.x = (Math.cos(lat2) * Math.cos(lon2));
        pos.y = (Math.cos(lat2) * Math.sin(lon2));
        pos.z = (Math.sin(lat2));

        debugObjectPositions[n*3+0] = pos.x;
        debugObjectPositions[n*3+1] = pos.y;
        debugObjectPositions[n*3+2] = pos.z;

        objectPositions[n * 3] = pos.x;
        objectPositions[n * 3 + 1] = pos.y;
        objectPositions[n * 3 + 2] = pos.z;


    }

}

//
// Start here
//


let numIndices = 0;

function main() {

    createInitialPositions();


    // If we don't have a GL context, give up now

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    // Vertex shader program

    // //

    const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform float otherObjectPositions[` + numPositions*3  + `];
    varying highp vec4 vColor;
    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      
      vec4 rotatedPos = normalize( aVertexPosition );
      vec4 otherPosV = vec4(otherObjectPositions[0],otherObjectPositions[1],otherObjectPositions[2],1.0);
      vec4 otherPosN = normalize( otherPosV );
      
        
      highp float phi1 = atan( rotatedPos.y, rotatedPos.x );
      highp float lam1 = acos( rotatedPos.z );
      
      highp float phi2 = atan( otherPosN.y, otherPosN.x );
      highp float lam2 = acos( otherPosN.z );
      
      highp float dPhi = phi2-phi1;
      highp float dLam = lam2-lam1;
      
      highp float havPhi = sin( dPhi/2.0 );
      highp float havDLam = sin( dLam/2.0 );
      
      highp float p1 = havPhi*havPhi; 
      highp float p2 = cos( phi1 )  * cos( phi2 );
      highp float p3 = havDLam * havDLam;
        
      float a = p1 + p2*p3;
      if( abs(a) > 0.99999 ){
        a = a*0.999;
      }
      highp float p4 = sqrt( p1+p2*p3);
      highp float c = 2.0 * atan(sqrt(a), sqrt(1.0-a));
              
            
      float dX = rotatedPos.x-otherPosN.x;
      float dY = rotatedPos.y-otherPosN.y;
      float dZ = rotatedPos.z-otherPosN.z;
      
      highp float c2 = sqrt( dX*dX+dY*dY+dZ*dZ );
      
      float r = 0.5+rotatedPos.z/2.0;
      float g = 0.5+rotatedPos.y/2.0;
      float b = 0.5+rotatedPos.x/2.0;
      
      float c3 = acos( dot( rotatedPos , otherPosN ) );
      
      if( c3 < 0.1 ){
          r = 1.0;
      }
          
      vColor = vec4( r,g,b,1.0);
    }
  `;

    // Fragment shader program

    const fsSource = `
    varying lowp vec4 vColor;
    void main(void) {
      gl_FragColor = vColor;
    }
  `;

    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // Collect all the info needed to use the shader program.
    // Look up which attributes our shader program is using
    // for aVertexPosition, aVevrtexColor and also
    // look up uniform locations.
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            otherObjectPositions: gl.getUniformLocation(shaderProgram, 'otherObjectPositions'),
        },
    };

    // Here's where we call the routine that builds all the
    // objects we'll be drawing.
    numIndices = initBuffers(gl);

    let then = 0;

    // Draw the scene repeatedly
    function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;

        drawScene(gl, programInfo, deltaTime);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

//
// initBuffers
//
//
function initBuffers(gl) {

    let SPHERE_DIV = 256;
    let i, ai, si, ci;
    let j, aj, sj, cj;
    let p1, p2;
    let vertices = [], indices = [];
    for (let j = 0; j <= SPHERE_DIV; j++) {
        aj = j * Math.PI / SPHERE_DIV;
        sj = Math.sin(aj);
        cj = Math.cos(aj);
        for (i = 0; i <= SPHERE_DIV; i++) {
            ai = i * 2 * Math.PI / SPHERE_DIV;
            si = Math.sin(ai);
            ci = Math.cos(ai);
            vertices.push(si * sj);  // X
            vertices.push(cj);       // Y
            vertices.push(ci * sj);  // Z
        }
    }

    for (let j = 0; j < SPHERE_DIV; j++) {
        for (i = 0; i < SPHERE_DIV; i++) {
            p1 = j * (SPHERE_DIV + 1) + i;
            p2 = p1 + (SPHERE_DIV + 1);
            indices.push(p1);
            indices.push(p2);
            indices.push(p1 + 1);
            indices.push(p1 + 1);
            indices.push(p2);
            indices.push(p2 + 1);
        }
    }

    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    let indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return indices.length;

}

//
// Draw the scene.
//


function drawScene(gl, programInfo, deltaTime) {


    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque

    gl.clearDepth(1);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfView = 35 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix,
        fieldOfView,
        aspect,
        zNear,
        zFar);


    mat4.translate(projectionMatrix, projectionMatrix, [0, 0, -5]);
    mat4.rotate(projectionMatrix, projectionMatrix, 0.2, [1, 0, 0]);
    mat4.rotate(projectionMatrix, projectionMatrix, -Math.PI*0.8, [0, 1, 0]); // rotate camera around Y axis

    const modelViewMatrix = mat4.create();


    // mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation / 4, [0.01, 0.01, 0.01]);

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;


        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);


        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }


    gl.useProgram(programInfo.program);

    // Set the shader uniforms
    gl.uniform1fv(programInfo.uniformLocations.otherObjectPositions, new Float32Array(objectPositions));

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);


    {
        const vertexCount = numIndices;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }

    mat4.translate(modelViewMatrix, modelViewMatrix, [debugObjectPositions[0], debugObjectPositions[1], debugObjectPositions[2]]);
    mat4.scale(modelViewMatrix, modelViewMatrix, [0.05, 0.05, 0.05]);

    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    {
        const vertexCount = numIndices;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }

 /*
    mat4.scale(modelViewMatrix, modelViewMatrix, [1.0/0.05, 1.0/0.05, 1.0/0.05]);
    mat4.translate(modelViewMatrix, modelViewMatrix, [-debugObjectPositions[0], -debugObjectPositions[1], -debugObjectPositions[2]]);
    mat4.translate(modelViewMatrix, modelViewMatrix, [debugObjectPositions[3], debugObjectPositions[4], debugObjectPositions[5]]);
    mat4.scale(modelViewMatrix, modelViewMatrix, [0.05, 0.05, 0.05]);

    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    {
        const vertexCount = numIndices;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }

*/
    // Update the rotation for the next draw
    updatePositions();
    cubeRotation += deltaTime;
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object

    gl.shaderSource(shader, source);

    // Compile the shader program

    gl.compileShader(shader);

    // See if it compiled successfully

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;

}

main();
