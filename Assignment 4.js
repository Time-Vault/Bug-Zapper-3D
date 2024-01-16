var canvas;
var gl;

var cBuffer;
var vColor;
var vBuffer;

var latBars = 50;
var longBars = 50;
var NumVertices  = (latBars+1)*(longBars+1)*6;
var NumMaxBact = 10, NumBact, isAlive;

var points = [];
var colors = [];

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;

var axis = 0;
var theta = [0,0,0 ];

var thetaLoc;

var mouseDown = false;
var x1 = 0, y1 = 0;

var bactCenter = [];
var bactColour = [];
var bactColourBuff = [];
var growthRate = [];
var currSize = [];
var bactPoints = [];
var bactIndices = [];

//Scoring
var pscore = 0;
var gscore = 0;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas, {preserveDrawingBuffer: true});
    if ( !gl ) { alert( "WebGL isn't available" ); }

    sphere();

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );

    vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    thetaLoc = gl.getUniformLocation(program, "theta");

    // Register the event handler to be called on key press or mouse drag
    document.onkeydown = function(ev){ keydown(ev, gl); };
    document.onmousedown = function(ev){ mouseDown = true; bactChecker(ev);};
    document.onmouseup = function(ev){ mouseDown = false;};
    document.onmousemove = function(ev){mouseDrag(ev, gl)};

    //create bacteria
    createBact();
            
    render();
}

function sphere() 
{

    let R = 0.5;

    var vertices = [];
    var vertexColours = [];
    var indices = [];

    //phi and theta are in radians
    for (var i=0; i <= latBars; i++) {
		let theta = i * Math.PI / latBars;
        
        for (var j=0; j <= longBars; j++) {
            let phi = j * 2 * Math.PI / longBars;
            //create vertices
            vertices.push(vec3(
                R*Math.sin(phi)*Math.cos(theta),
                R*Math.sin(phi)*Math.sin(theta),
                R*Math.cos(phi)
            ));

            //create indices for triangles

            //indices need to be between neighbouring points at
            //the very least
            let vert1 = (i*(latBars+1))+j;
            let vert2 = vert1+longBars;

            indices.push(vert1);
            indices.push(vert2);
            indices.push(vert1+1);

            indices.push(vert2);
            indices.push(vert2+1);
            indices.push(vert1+1);

            if(i%5==0 && j%5==0){
                vertexColours.push([ 0, 0, 0, 1.0 ])
            }else{
                vertexColours.push([ 0.5, 0.5, 0.5, 1.0 ]);
            }
        }
    }

    //Create triangles between points
    for ( var i = 0; i < indices.length; ++i ) {
        
        if (indices[i]<vertices.length){
            points.push( vertices[indices[i]] );
            //Provide points of reference
            colors.push( vertexColours[indices[i]] )
        }
        
    }
}

function keydown(ev, gl) {
    if(ev.keyCode == 39) { // The right arrow key was pressed
      theta[yAxis] += 2.0;
    } else 
    if (ev.keyCode == 37) { // The left arrow key was pressed
      theta[yAxis] -= 2.0;
    } else
    if (ev.keyCode == 38) { // The up arrow key was pressed
        theta[xAxis] -= 2.0;
    } else 
    if (ev.keyCode == 40) { // The down arrow key was pressed
        theta[xAxis] += 2.0;
    } else { return; }   

    gl.uniform3fv(thetaLoc, theta);
}

function mouseDrag(ev, gl) {
    var x2 = ev.clientX; // x coordinate of a mouse pointer
    var y2 = ev.clientY; // y coordinate of a mouse pointer

    if(mouseDown == true){
        newX = (x2-x1)/2;
        newY = (y2-y1)/2;
        theta[yAxis] += (x2-x1)/2;
        theta[xAxis] += (y2-y1)/2;

        gl.uniform3fv(thetaLoc, theta);
    }
    x1 = x2;
    y1 = y2;
}

function createBact(){
    //Create a minimum of 2 bacteria
    NumBact = Math.max(Math.ceil(Math.random()*NumMaxBact), 2);
    isAlive = new Array(NumBact);
    for (var i = 0; i < NumBact; i++){
        //The formula for randomNum is used to get a main vertex, since the
        //points array uses 6 indices in order to store the neighbouring vertices of each vertex.
        var randomNum = Math.floor(Math.random()*Math.floor(NumVertices/6))*6;
        bactCenter.push(points[randomNum]);
        //Give each bacteria a colour
        bactColour.push([ Math.random(), Math.random(), Math.random(), 1.0 ])
        bactColourBuff.push([]);
        growthRate.push(Math.floor(Math.random()*5)+1);
        currSize.push(1);
        bactPoints.push([]);
        bactColourBuff.push([]);
        isAlive[i] = true;
    }
    bactRender();
}

function bactRender(){
    //Put growing bacteria on circle
    
    //Reset
    for(var k = 0; k<NumBact; k++){
        if (isAlive[k]){
            if (currSize[k] > 5000){
                gscore++;
                document.getElementById('game_points').innerHTML = 'Game points: ' + gscore;
                //Kill winning bacteria to prevent the player from scoring
                isAlive[k] = false; 
            }

            bactPoints[k]=[];
            bactColourBuff[k]=[];

            var vertices = [];
            var vertexColours = [];
            var indices = [];

            //phi and theta are in radians
            for (var i=0; i <= latBars; i++) {
                let theta = i * Math.PI / latBars;
                
                for (var j=0; j <= longBars; j++) {
                    let phi = j * 2 * Math.PI / longBars;
                    
                    //create vertices
                    vertices.push(vec3(
                        bactCenter[k][0]+(currSize[k]/10000)*Math.sin(phi)*Math.cos(theta),
                        bactCenter[k][1]+(currSize[k]/10000)*Math.sin(phi)*Math.sin(theta),
                        bactCenter[k][2]+(currSize[k]/10000)*Math.cos(phi)
                    ));

                    //create indices for triangles

                    //indices need to be between neighbouring points at
                    //the very least
                    let vert1 = (i*(latBars+1))+j;
                    let vert2 = vert1+longBars;

                    indices.push(vert1);
                    indices.push(vert2);
                    indices.push(vert1+1);

                    indices.push(vert2);
                    indices.push(vert2+1);
                    indices.push(vert1+1);
                    vertexColours.push(bactColour[k]);
                }
            }

            //Create triangles between points
            for ( var i = 0; i < indices.length; ++i ) {
                
                if (indices[i]<vertices.length){
                    bactPoints[k].push( vertices[indices[i]] );
                    //Provide points of reference
                    bactColourBuff[k].push( vertexColours[indices[i]] )
                }
                
            }

            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
            gl.bufferData( gl.ARRAY_BUFFER, flatten(bactColourBuff[k]), gl.STATIC_DRAW );

            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
            gl.bufferData( gl.ARRAY_BUFFER, flatten(bactPoints[k]), gl.STATIC_DRAW );

            gl.drawArrays( gl.TRIANGLES, 0, NumVertices);

            //Increase bacteria size
            currSize[k]+=growthRate[k];
        }
    }
}

function render()
{
    if (gscore >= 2){
        document.getElementById('win_lose').innerHTML = 'You lose!';
        document.getElementById('win_lose').style.color = "red";
        for (var i = 0; i < NumBact; i++){
            isAlive[i] = false;
        }
    }
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    bactRender();
    
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );

    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    gl.drawArrays( gl.TRIANGLES, 0, NumVertices );

    requestAnimationFrame( render );
}

function bactChecker(ev){
    var mx = ev.clientX; // x coordinate of a mouse pointer
    var my = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect() ;

    //Translate mx and my into canvas coordinates
    var checkX = ((mx - rect.left) - canvas.width/2)/(canvas.width/2);
    var checkY = (canvas.height/2 - (my - rect.top))/(canvas.height/2);

    //Ensure that the click is on the canvas before doing anything else
    if (Math.abs(checkX) <= 1 && Math.abs(checkY) <= 1){
        //Create an array to hold RGBA values
        var pixels = new Uint8Array(4);
        //Get information about clicked pixel
        gl.readPixels((mx-rect.left), canvas.height - (my-rect.top), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        console.log(mx + "," + my + ", Colour: (" + pixels + ")");

        for (var i = 0; i < NumBact; i++){
            if (isAlive[i] && colourChecker(pixels, bactColour[i])){
                isAlive[i] = false;

                pscore++;
                //Record score
                document.getElementById('player_points').innerHTML = 'Player points: '+ pscore;

                //Check for player win
                if (pscore>=NumBact-1){
                    document.getElementById('win_lose').innerHTML = 'You win!';
                    document.getElementById('win_lose').style.color = "green";
                
                    for (var i = 0; i < NumBact; i++){
                        isAlive[i] = false;
                    }
                }

                break;
            }
        }          
    }
}

function colourChecker(pixels, currentBact){
    for (var j = 0; j<3; j++){
        //Returned values fall between 0 and 1
        scaledColour = currentBact[j] * 255;

        //Allow for a slight tolerance between expected and returned values, as scaledColour cannout be accurately floored or cielled
        if (pixels[j] < scaledColour-1 || pixels[j] > scaledColour+1)
            return false;
    }
    return true;
}