/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/ellipsoids.json"; // ellipsoids file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space
var lookAt = new vec4.fromValues(0.5, 0.5, 0.5, 0.0);
var lookUp = new vec4.fromValues(0.0, 1.0, 0.0, 1.0);

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer = []; // this contains vertex coordinates in triples
var normalBuffer = [];
var triangleBuffer = []; // this contains indices into vertexBuffer in triples
var triBufferSize = []; // the number of indices in the triangle buffer
var ambientBuffer = [];
var diffuseBuffer = [];
var specularBuffer = [];
var isColorSet;
var nBuffer = [];
var vertexPositionAttrib; // where to put position for vertex shader
var vertexNormalAttribute;
var togglePhongShade = true;

var pMatrixUniform;
var mvMatrixUniform;
var nMatrixUniform;
var pointLightingDiffuseColorUniform;
var togglePhongShadeUniform;

var pointLightingLocationUniform;
var pointEyeLocationUniform;

var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

var setTri = -1;
var setEli = -1;

// Vector class
class Vector {
    constructor(x,y,z) {
        this.set(x,y,z);
    } // end constructor

    // sets the components of a vector
    set(x,y,z) {
        try {
            if ((typeof(x) !== "number") || (typeof(y) !== "number") || (typeof(z) !== "number"))
                throw "vector component not a number";
            else
                this.x = x; this.y = y; this.z = z;
        } // end try

        catch(e) {
            console.log(e);
        }
    } // end vector set

    // copy the passed vector into this one
    copy(v) {
        try {
            if (!(v instanceof Vector))
                throw "Vector.copy: non-vector parameter";
            else
                this.x = v.x; this.y = v.y; this.z = v.z;
        } // end try

        catch(e) {
            console.log(e);
        }
    }

    toConsole(prefix="") {
        console.log(prefix+"["+this.x+","+this.y+","+this.z+"]");
    } // end to console

    // static dot method
    static dot(v1,v2) {
        try {
            if (!(v1 instanceof Vector) || !(v2 instanceof Vector))
                throw "Vector.dot: non-vector parameter";
            else
                return(v1.x*v2.x + v1.y*v2.y + v1.z*v2.z);
        } // end try

        catch(e) {
            console.log(e);
            return(NaN);
        }
    } // end dot static method

    // static cross method
    static cross(v1,v2) {
        try {
            if (!(v1 instanceof Vector) || !(v2 instanceof Vector))
                throw "Vector.cross: non-vector parameter";
            else {
                var crossX = v1.y*v2.z - v1.z*v2.y;
                var crossY = v1.z*v2.x - v1.x*v2.z;
                var crossZ = v1.x*v2.y - v1.y*v2.x;
                return(new Vector(crossX,crossY,crossZ));
            } // endif vector params
        } // end try

        catch(e) {
            console.log(e);
            return(NaN);
        }
    } // end dot static method

    // static add method
    static add(v1,v2) {
        try {
            if (!(v1 instanceof Vector) || !(v2 instanceof Vector))
                throw "Vector.add: non-vector parameter";
            else
                return(new Vector(v1.x+v2.x,v1.y+v2.y,v1.z+v2.z));
        } // end try

        catch(e) {
            console.log(e);
            return(new Vector(NaN,NaN,NaN));
        }
    } // end add static method

    // static subtract method, v1-v2
    static subtract(v1,v2) {
        try {
            if (!(v1 instanceof Vector) || !(v2 instanceof Vector))
                throw "Vector.subtract: non-vector parameter";
            else {
                var v = new Vector(v1.x-v2.x,v1.y-v2.y,v1.z-v2.z);
                return(v);
            }
        } // end try

        catch(e) {
            console.log(e);
            return(new Vector(NaN,NaN,NaN));
        }
    } // end subtract static method

    // static scale method
    static scale(c,v) {
        try {
            if (!(typeof(c) === "number") || !(v instanceof Vector))
                throw "Vector.scale: malformed parameter";
            else
                return(new Vector(c*v.x,c*v.y,c*v.z));
        } // end try

        catch(e) {
            console.log(e);
            return(new Vector(NaN,NaN,NaN));
        }
    } // end scale static method

    // static normalize method
    static normalize(v) {
        try {
            if (!(v instanceof Vector))
                throw "Vector.normalize: parameter not a vector";
            else {
                var lenDenom = 1/Math.sqrt(Vector.dot(v,v));
                return(Vector.scale(lenDenom,v));
            }
        } // end try

        catch(e) {
            console.log(e);
            return(new Vector(NaN,NaN,NaN));
        }
    } // end scale static method

} // end Vector class

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get json file

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
 
} // end setupWebGL

// setup the webGL shaders
function setupShaders() {
    
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float;
        
        varying vec3 vTransformedNormal;
        varying vec4 vPosition;
        
        uniform float uMaterialShininess;
        uniform bool  uToggleShininess;
        uniform vec3 uAmbientColor;
        uniform vec3 uPointLightingDiffuseColor;
        uniform vec3 uPointLightingSpecularColor;
        
        uniform vec3 uPointLightingLocation;
        uniform vec3 uPointEyeLocation;

        void main(void) {
            
            vec3 lightWeighting;
            if (!true) { //uUseLighting
                lightWeighting = vec3(1.0, 1.0, 1.0);
            } else {
                vec3 lightDirection = normalize(uPointLightingLocation - vPosition.xyz);
                vec3 normal = normalize(vTransformedNormal);
    
                float specularLightWeighting = 0.0;

                if(uToggleShininess){
                    vec3 eyeDirection = normalize(uPointEyeLocation - vPosition.xyz);
                    vec3 h_direction = normalize(lightDirection + eyeDirection);
                    specularLightWeighting = pow(max(dot(normal, h_direction), 0.0), uMaterialShininess);
                }
                else{
                    vec3 eyeDirection = normalize(uPointEyeLocation - vPosition.xyz);
                    vec3 reflectionDirection = reflect(-lightDirection, normal);
                    specularLightWeighting = pow(max(dot(reflectionDirection, eyeDirection), 0.0), uMaterialShininess);
                }
                
                // color = ka*La + kd*Ld(N*L) + ks*Ls(N*H)^n
                float diffuseLightWeighting = max(dot(normal, lightDirection), 0.0);
                lightWeighting = uAmbientColor
                    + uPointLightingSpecularColor * specularLightWeighting
                    + uPointLightingDiffuseColor * diffuseLightWeighting;
            }
    
            vec4 fragmentColor;
            fragmentColor = vec4(1.0, 1.0, 1.0, 1.0);
            
            gl_FragColor = vec4(fragmentColor.rgb * lightWeighting, fragmentColor.a);
        }
    `;
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 aVertexPosition;
        attribute vec3 aVertexNormal;
        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;
        uniform mat3 uNMatrix;
        
        varying vec3 vTransformedNormal;
        varying vec4 vPosition;
        
        void main(void) {
            vPosition =  vec4(aVertexPosition, 1.0);
            gl_Position = uPMatrix * uMVMatrix * vPosition;
            vTransformedNormal = aVertexNormal;
        }
    `;
    
    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)

                vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "aVertexPosition");
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array

                vertexNormalAttribute  = gl.getAttribLocation(shaderProgram, "aVertexNormal");
                gl.enableVertexAttribArray(vertexNormalAttribute); // input to shader from array

                pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
                mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
                nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");

                pointLightingLocationUniform = gl.getUniformLocation(shaderProgram, "uPointLightingLocation");
                pointEyeLocationUniform = gl.getUniformLocation(shaderProgram, "uPointEyeLocation");

                ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
                pointLightingDiffuseColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingDiffuseColor");
                pointLightingSpecularColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingSpecularColor");
                materialShininessUniform = gl.getUniformLocation(shaderProgram, "uMaterialShininess");
                togglePhongShadeUniform = gl.getUniformLocation(shaderProgram, "uToggleShininess");

            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

function setMatrixUniforms(){
    mat4.perspective(pMatrix, Math.PI/2.0, 1, 0.1, 100.0);
    mat4.lookAt(mvMatrix, Eye, lookAt, lookUp);
    gl.uniformMatrix4fv(pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(mvMatrixUniform, false, mvMatrix);

    var normalMatrix = mat3.create();
    mat4.invert(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix, normalMatrix);
    gl.uniformMatrix3fv(nMatrixUniform, false, normalMatrix);
}

// read triangles in, load them into webgl buffers
function loadTriangles(inputTriangles, inputEllipsoids) {
    // var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");
    // var inputEllipsoids = getJSONFile(INPUT_SPHERES_URL,"ellipsoids");
    vertexBuffer = []; // this contains vertex coordinates in triples
    normalBuffer = [];
    triangleBuffer = [];
    triBufferSize = [];

    var obj = -1;

    if (inputTriangles != String.null) {

        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            obj++;
            triBufferSize.push(0);
            var whichSetVert; // index of vertex in current triangle set
            var whichSetTri; // index of triangle in current triangle set
            var coordArray = []; // 1D array of vertex coords for WebGL
            var normalArray = [];
            var indexArray = []; // 1D array of vertex indices for WebGL
            var vtxBufferSize = 0; // the number of vertices in the vertex buffer
            var vtxToAdd = []; // vtx coords to add to the coord array
            var normalToAdd = [];
            var indexOffset = vec3.create(); // the index offset for the current set
            var triToAdd = vec3.create(); // tri indices to add to the index array

            vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize); // update vertex offset

            if(!isColorSet) {
                ambientBuffer[obj] = inputTriangles[whichSet].material.ambient;
                diffuseBuffer[obj] = inputTriangles[whichSet].material.diffuse;
                specularBuffer[obj] = inputTriangles[whichSet].material.specular;
                nBuffer[obj] = inputTriangles[whichSet].material.n;
            }

            // set up the vertex coord array
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);

                normalToAdd = inputTriangles[whichSet].normals[whichSetVert];
                normalArray.push(normalToAdd[0],normalToAdd[1],normalToAdd[2]);

            } // end for vertices in set

            // set up the triangle index array, adjusting indices across sets
            for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
                vec3.add(triToAdd,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]);
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
            } // end for triangles in set

            vtxBufferSize += inputTriangles[whichSet].vertices.length; // total number of vertices
            triBufferSize[obj] += inputTriangles[whichSet].triangles.length; // total number of tris

            triBufferSize[obj] *= 3; // now total number of indices

            // send the vertex coords to webGL
            vertexBuffer[obj] = gl.createBuffer(); // init empty vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer[obj]); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer

            // send the vertex normals to webGL
            normalBuffer[obj] = gl.createBuffer(); // init empty vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer[obj]); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normalArray),gl.STATIC_DRAW); // normals to that buffer

            // send the triangle indices to webGL
            triangleBuffer[obj] = gl.createBuffer(); // init empty triangle index buffer
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer[obj]); // activate that buffer
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer

        } // end for each triangle set

        for (var whichSet=0; whichSet<inputEllipsoids.length; whichSet++) {
            obj++;
            triBufferSize.push(0);
            var whichSetVert; // index of vertex in current triangle set
            var whichSetTri; // index of triangle in current triangle set
            var coordArray = []; // 1D array of vertex coords for WebGL
            var normalArray = [];
            var indexArray = []; // 1D array of vertex indices for WebGL
            var vtxBufferSize = 0; // the number of vertices in the vertex buffer
            var vtxToAdd = []; // vtx coords to add to the coord array
            var normalToAdd = [];
            var indexOffset = vec3.create(); // the index offset for the current set
            var triToAdd = vec3.create(); // tri indices to add to the index array

            vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize); // update vertex offset
            // Starts here
            var latitudeBands = 20;
            var longitudeBands = 20;

            var c_x = inputEllipsoids[whichSet].x;
            var c_y = inputEllipsoids[whichSet].y;
            var c_z = inputEllipsoids[whichSet].z;
            var a = inputEllipsoids[whichSet].a;
            var b = inputEllipsoids[whichSet].b;
            var c = inputEllipsoids[whichSet].c;
            if(!isColorSet) {
                ambientBuffer[obj] = inputEllipsoids[whichSet].ambient;
                diffuseBuffer[obj] = inputEllipsoids[whichSet].diffuse;
                specularBuffer[obj] = inputEllipsoids[whichSet].specular;
                nBuffer[obj] = inputEllipsoids[whichSet].n;
            }

            for (var latNumber=0; latNumber <= latitudeBands; latNumber++) {
                var theta = latNumber * Math.PI / latitudeBands;
                var sinTheta = Math.sin(theta);
                var cosTheta = Math.cos(theta);

                for (var longNumber=0; longNumber <= longitudeBands; longNumber++) {
                    var phi = longNumber * 2 * Math.PI / longitudeBands;
                    var sinPhi = Math.sin(phi);
                    var cosPhi = Math.cos(phi);

                    var x = cosPhi * sinTheta;
                    var y = cosTheta;
                    var z = sinPhi * sinTheta;

                    normal_V = Vector.normalize(new Vector(2 * x / (a * a), 2 * y / (b * b), 2 * z / (c * c)));
                    surface_R = new Vector(c_x + a * x, c_y + b * y, c_z + c * z)
                    normalArray.push(normal_V.x, normal_V.y, normal_V.z);
                    coordArray.push(surface_R.x, surface_R.y, surface_R.z);
                    vtxBufferSize += 1;
                }
            }

            for (var latNumber=0; latNumber < latitudeBands; latNumber++) {
                for (var longNumber=0; longNumber < longitudeBands; longNumber++) {
                    var first = (latNumber * (longitudeBands + 1)) + longNumber;
                    var second = first + longitudeBands + 1;
                    vec3.add(triToAdd,indexOffset, [first, second, first + 1]);
                    indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
                    vec3.add(triToAdd,indexOffset, [second, second + 1, first + 1]);
                    indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
                    triBufferSize[obj] += 2
                }
            }

            triBufferSize[obj] *= 3; // now total number of indices

            // send the vertex coords to webGL
            vertexBuffer[obj] = gl.createBuffer(); // init empty vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer[obj]); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer

            // send the vertex normals to webGL
            normalBuffer[obj] = gl.createBuffer(); // init empty vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer[obj]); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normalArray),gl.STATIC_DRAW); // normals to that buffer

            // send the triangle indices to webGL
            triangleBuffer[obj] = gl.createBuffer(); // init empty triangle index buffer
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer[obj]); // activate that buffer
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer

        } // end for each ellipsoid set

    } // end if triangles found

    renderTriangles();
} // end load triangles

// render the loaded model
function renderTriangles() {
    setMatrixUniforms();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

    gl.uniform3f(pointLightingLocationUniform, -1, 3, -0.5);
    gl.uniform3f(pointEyeLocationUniform, Eye[0],Eye[1],Eye[2]);

    for(i =0; i<vertexBuffer.length; i++){


        gl.uniform1f(togglePhongShadeUniform, togglePhongShade);

        gl.uniform3f(ambientColorUniform, ambientBuffer[i][0], ambientBuffer[i][1], ambientBuffer[i][2]);
        gl.uniform3f(pointLightingDiffuseColorUniform, diffuseBuffer[i][0], diffuseBuffer[i][1], diffuseBuffer[i][2]);
        gl.uniform3f(pointLightingSpecularColorUniform, specularBuffer[i][0], specularBuffer[i][1], specularBuffer[i][2]);
        gl.uniform1f(materialShininessUniform, nBuffer[i]);

        // vertex buffer: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer[i]); // activate
        gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

        // normal buffer: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer[i]); // activate
        gl.vertexAttribPointer(vertexNormalAttribute ,3,gl.FLOAT,false,0,0); // feed

        // triangle buffer: activate and render
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffer[i]); // activate
        gl.drawElements(gl.TRIANGLES,triBufferSize[i],gl.UNSIGNED_SHORT,0); // render
    }

} // end render triangles

function updateAndLoadTriangles(inputTriangles, inputEllipsoids){
    var tri = JSON.parse(JSON.stringify(inputTriangles));
    var eli = JSON.parse(JSON.stringify(inputEllipsoids));
    if(setTri >= 0){
        var center = new vec3.fromValues(0,0,0);
        for(var i = 0; i< tri[setTri].vertices.length; i++){
            var temp = tri[setTri].vertices[i];
            vec3.add(center, center, new vec3.fromValues(temp[0],temp[1],temp[2]))
        }
        vec3.scale(center, center, 1/tri[setTri].vertices.length);
        var center_ = new vec3.fromValues(0,0,0);
        vec3.scale(center_, center, -0.2);
        for(var i = 0; i< tri[setTri].vertices.length; i++){
            var temp = new vec3.fromValues(tri[setTri].vertices[i][0],tri[setTri].vertices[i][1],tri[setTri].vertices[i][2]);
            vec3.scale(temp, temp, 1.2);
            vec3.add(temp, temp, center_);
            tri[setTri].vertices[i] = temp;
        }
    }
    if(setEli >= 0){
        eli[setEli].a *= 1.2;
        eli[setEli].b *= 1.2;
        eli[setEli].c *= 1.2;
    }
    loadTriangles(tri, eli);
}

function updateColorAndLoadTriangles(inputTriangles, inputEllipsoids, a, d, s, n) {
    var offset = -1;
    isColorSet = true;
    if(setTri >= 0){
        offset = setTri;
        nBuffer[offset] -= n;
        if(nBuffer[offset] < 2){
            nBuffer[offset] = inputTriangles[setTri].material.n;
        }
    }
    else if(setEli >= 0){
        offset = inputTriangles.length + setEli;
        nBuffer[offset] -= n;
        if(nBuffer[offset] < 2){
            nBuffer[offset] = inputEllipsoids[setEli].n;
        }
    }

    if(offset >= 0){
        if (ambientBuffer[offset][0] >= 0.9){
            ambientBuffer[offset] = [0.1, 0.1, 0.1];
        }
        for(var i=0; i< ambientBuffer[offset].length; i++){
            ambientBuffer[offset][i] += a[0];
        }

        if (Math.max(...diffuseBuffer[offset]) >= 0.9){
            for(var i=0; i< diffuseBuffer[offset].length; i++){
                if (diffuseBuffer[offset][i] > 0){
                    diffuseBuffer[offset][i] = 0.1
                }
            }
        }
        for(var i=0; i< diffuseBuffer[offset].length; i++){
            if (diffuseBuffer[offset][i] > 0){
                diffuseBuffer[offset][i] += d[0];
            }
        }
        if (specularBuffer[offset][0] >= 0.9){
            specularBuffer[offset] = [0.1, 0.1, 0.1];
        }
        for(var i=0; i< specularBuffer[offset].length; i++){
            specularBuffer[offset][i] += s[0];
        }
    }
    updateAndLoadTriangles(inputTriangles, inputEllipsoids);
}

function initializeControls(inputTriangles, inputEllipsoids){
    document.addEventListener('keydown', function(event) {
        console.log(event.code);
        var p0 = [0.0,0.0,0.0];
        var p1 = [0.1,0.1,0.1];
        switch(event.code)
        {
            case 'KeyA':
                if (event.shiftKey){ //Capital A
                    lookAt[0] -= 0.1;
                    renderTriangles();
                }
                else{//Small a
                    Eye[0] -= 0.1;
                    lookAt[0] -= 0.1;
                    renderTriangles();
                }
                break;
            case 'KeyD':
                if (event.shiftKey){ //Capital D
                    lookAt[0] += 0.1;
                    renderTriangles();
                }
                else{//Small d
                    Eye[0] += 0.1;
                    lookAt[0] += 0.1;
                    renderTriangles();
                }
                break;
            case 'KeyW':
                if (event.shiftKey){ //Capital W
                    lookAt[1] += 0.1;
                    renderTriangles();
                }
                else{//Small w
                    Eye[2] -= 0.1;
                    lookAt[2] -= 0.1;
                    renderTriangles();
                }
                break;
            case 'KeyS':
                if (event.shiftKey){ //Capital S
                    lookAt[1] -= 0.1;
                    renderTriangles();
                }
                else{//Small s
                    Eye[2] += 0.1;
                    lookAt[2] += 0.1;
                    renderTriangles();
                }
                break;
            case 'KeyQ':
                Eye[1] -= 0.1;
                lookAt[1] -= 0.1;
                renderTriangles();
                break;
            case 'KeyE':
                Eye[1] += 0.1;
                lookAt[1] += 0.1;
                renderTriangles();
                break;
            case 'ArrowUp':
                setEli += 1;
                setEli = setEli % inputEllipsoids.length;
                setTri = -1;
                updateAndLoadTriangles(inputTriangles, inputEllipsoids);
                break;
            case 'ArrowDown':
                setEli -= 1;
                if(setEli < 0){
                    setEli = inputEllipsoids.length - 1;
                }
                setTri = -1;
                updateAndLoadTriangles(inputTriangles, inputEllipsoids);
                break;
            case 'ArrowLeft':
                setEli = -1;
                setTri += 1;
                setTri = setTri % inputTriangles.length;
                updateAndLoadTriangles(inputTriangles, inputEllipsoids);
                break;
            case 'ArrowRight':
                setEli = -1;
                setTri -= 1;
                if(setTri < 0){
                    setTri = inputTriangles.length - 1;
                }
                updateAndLoadTriangles(inputTriangles, inputEllipsoids);
                break;
            case 'Space':
                setEli = -1;
                setTri = -1;
                loadTriangles(inputTriangles, inputEllipsoids);
                break;
            case 'KeyN':
                updateColorAndLoadTriangles(inputTriangles, inputEllipsoids,p0,p0,p0,1);
                break;
            case 'Digit1':
                updateColorAndLoadTriangles(inputTriangles, inputEllipsoids, p1, p0, p0, 0);
                break;
            case 'Digit2':
                updateColorAndLoadTriangles(inputTriangles, inputEllipsoids, p0, p1, p0, 0);
                break;
            case 'Digit3':
                updateColorAndLoadTriangles(inputTriangles, inputEllipsoids, p0, p0, p1, 0);
                break;
            case 'KeyB':
                togglePhongShade = !togglePhongShade;
                setupShaders();
                updateAndLoadTriangles(inputTriangles, inputEllipsoids);
                break;
            default:
                break;
        }
        //alert('Undo!')
    });
}

/* MAIN -- HERE is where execution begins after window load */

function main() {
  
    setupWebGL(); // set up the webGL environment
    setupShaders();
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");
    var inputEllipsoids = getJSONFile(INPUT_SPHERES_URL,"ellipsoids");
    loadTriangles(inputTriangles, inputEllipsoids); // load in the triangles from tri file
    // setupShaders(); // setup the webGL shaders
    //setMatrixUniforms();
    //renderTriangles(); // draw the triangles using webGL
    initializeControls(inputTriangles, inputEllipsoids);
  
} // end main
