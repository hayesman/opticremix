// Optic Remix
// JS image processing code
// (to be used with 426_final.maxpat)

// By Eric Hayes, Nina He, Charmaine Chan
// COS 426 - Spring 2019
// Princeton University

// In its current version, this code uses manually recorded points 
// to map the projection.  We used video frames with 128x128 resolution
// and projected the image from a 1280x720 projector.

inlets = 1;
outlets = 1;

// Jitter matrices (these are set in the Max patch)
var img_matrix4 = new JitterMatrix ("imgMatrix4");
var img_matrix5 = new JitterMatrix ("imgMatrix5");
var tmp_matrix = new JitterMatrix ("tmpMatrix");
var output_matrix = new JitterMatrix("outputMatrix");

// These parameters are also updated in the Max patch
var input = 0.0;
var filterCase = 0;

// Horizontal and vertical resolution of the images
var IMAGESIZE = 128;

// Process this frame of the video
function jit_matrix () {

  var height = IMAGESIZE;
  var width = IMAGESIZE;


  if (filterCase == 1) {
    filter1(input, img_matrix5);
  } else if (filterCase == 2) {
    filterPixel(input, img_matrix4);
  } else if (filterCase == 3) {
    filterHue(input, img_matrix5, tmp_matrix);
  } else if (filterCase == 4) {
    filterHue(input, img_matrix5, tmp_matrix);
    filterHue(input, img_matrix4, tmp_matrix);
  } else if (filterCase == 5) {
    filterBlueRed(input, img_matrix5, tmp_matrix);
  } else if (filterCase == 6) {
    filterHue(input, img_matrix5, tmp_matrix);
    filterPixel(input, img_matrix4);
  }

  // Array of corners for each projection face (in the following order):
  // dstTopLeftX
  // dstTopLeftY
  // dstTopRightX
  // dstTopRightY
  // dstBotLeftX
  // dstBotLeftY
  // dstBotRightX
  // dstBotRightY

  var side1 = [201, 378, 352, 385, 229, 653, 379, 693];
  var side2 = [201, 378, 488, 341, 352, 385, 657, 348];
  var side3 = [352, 385, 657, 348, 379, 693, 664, 624];
  var side4 = [471, 72, 643, 41, 488, 341, 657, 348];
  var side5 = [643, 41, 837, 50, 657, 348, 842, 336];
  var side6 = [657, 348, 940, 356, 664, 624, 938, 675];
  var side7 = [657, 348, 842, 336, 940, 356, 1118, 342];
  var side8 = [940, 356, 1118, 342, 938, 675, 1111, 628];

  var destPointsList = [side1, side2, side3, side4, side5, side6, side7, side8];

  // Distort the images for projection
  for (var i = 0; i < destPointsList.length; i++) {
    if (i % 2 == 0) {
      perspectiveWarp(destPointsList[i], img_matrix5);
    } else {
      perspectiveWarp(destPointsList[i], img_matrix4);
    }
  }

	outlet(0, "jit_matrix", output_matrix.name, "draw_pixels");
	
}



// filter that pixelates image
function filterPixel(input, img) {
  if (input == 0) input += .05;
  var sizebox = Math.ceil(IMAGESIZE/ Math.ceil(input * 20));
    for (var x = 0; x < IMAGESIZE; x+=sizebox) {
      for (var y = 0; y < IMAGESIZE; y+=sizebox) {
        for (var i = x; i < x+sizebox; i++) {
          for (var j = y; j < y+sizebox; j++) {
            var xval = (Math.random() * IMAGESIZE)/2;
            var yval = (Math.random() * IMAGESIZE)/2;
            var pixel = img.getcell(x, y);
            img.setcell2d(i, j, pixel[0], pixel[1], pixel[2], pixel[3]);

          }
        }
      }
    }
}





// hue changing filter
function filterHue(input, img) {
for (var x = 0; x < IMAGESIZE; x++) {
  for (var y = 0; y < IMAGESIZE; y++) {
    var pixel = img.getcell(x, y);
    var r = pixel[1]/255.0,
    g = pixel[2]/255.0,
    b = pixel[3]/255.0;
    var max = Math.max(r, g, b),
    min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if ( max == min ) {
      h = s = 0; // achromatic
    } 
    else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch( max ) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    } 
    h = h - input;
    var m1, m2;
    m2 = (l <= 0.5) ? l * (s + 1) : l + s - l * s;
    m1 = l * 2 - m2;
    var hueToRGB = function( m1, m2, h ) {
      h = ( h < 0 ) ? h + 1 : ((h > 1) ? h - 1 : h);
      if ( h * 6 < 1 ) return m1 + (m2 - m1) * h * 6;
      if ( h * 2 < 1 ) return m2;
      if ( h * 3 < 2 ) return m1 + (m2 - m1) * (0.66666 - h) * 6;
      return m1;
    };
    pixel[1] = hueToRGB( m1, m2, h + 1 / 3 );
    pixel[2] = hueToRGB( m1, m2, h         );
    pixel[3] = hueToRGB( m1, m2, h - 1 / 3 );
    img.setcell2d(x, y, Math.floor(pixel[0]*255), Math.floor(pixel[1]*255), Math.floor(pixel[2]*255), Math.floor(pixel[3]*255));
  }
}
}


function filterBlueRed(input, img, tmp) {

  var value = input * 40;

  for (var x = 0; x < IMAGESIZE; x++) {
    for (var y = 0; y < IMAGESIZE; y++) {
      var pixblue = img.getcell(x, y);
      pixblue[3] /= 255.0;
      pixblue[2] /= 255.0;
      pixblue[1] /= 255.0;

      pixblue[3] *= 3;
      pixblue[1] /= 3;

      var pixred = tmp.getcell(x, y)
      pixred[3] /= 255.0;
      pixred[2] /= 255.0;
      pixred[1] /= 255.0;
      pixred[1] *= 3;
      img.setcell2d(x, y, 255, Math.floor(255*pixblue[1]), Math.floor(255*pixblue[2]), Math.floor(255*pixblue[3]));
      tmp.setcell2d(x, y, 255, Math.floor(255*pixred[1]), Math.floor(255*pixred[2]), Math.floor(255*pixred[3]));

    }
  }

  for (var x = 0; x < IMAGESIZE - value; x++) {
    for (var y = 0; y < IMAGESIZE; y++) {
      var pblue = img.getcell(x, y);
      var pred = tmp.getcell(x+ value,y);

      pblue[3] /= 255.0;
      pblue[2] /= 255.0;
      pblue[1] /= 255.0;
      pred[3]  /= 255.0;
      pred[2]  /= 255.0;
      pred[1]  /= 255.0;

      img.setcell2d(x, y, 255, Math.floor(255*(pblue[1] + pred[1])/2), Math.floor(255*(pblue[2] + pred[2])/2), Math.floor(255*(pblue[3] + pred[3])/2));
    }
  }

}


function filter1(input, img) {

  var upbound = Math.ceil(input*200);

  for (var q = 0; q < upbound; q++) {
      var centerx = Math.random() * IMAGESIZE;
      var centery = Math.random() * IMAGESIZE;
      for (var j = centerx; j < centerx + 10; j++) {
          if (j > IMAGESIZE) break;
          for (var k = centery; k < centery + 10; k++) {
              if (k > IMAGESIZE) break;
              var pixel = img.getcell(centerx, centery);
              img.setcell2d(j, k, pixel[0], pixel[1], pixel[2], pixel[3]);
          }
      }
  }
}



// Warp the image to the appropriate place using forward-sampling.
// Based on code available here:
// https://math.stackexchange.com/questions/296794/finding-the-transform-matrix-from-4-projected-%20points-with-javascript
function perspectiveWarp(destPoints, image) {


  //var finalImage = image.copyImg();

  // Helper functions
  function adj(m) { // Compute the adjugate of m
    return [
      m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4],
      m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5],
      m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3]
    ];
  }
  function multmm(a, b) { // multiply two matrices
    var c = Array(9);
    for (var i = 0; i != 3; ++i) {
      for (var j = 0; j != 3; ++j) {
        var cij = 0;
        for (var k = 0; k != 3; ++k) {
          cij += a[3*i + k]*b[3*k + j];
        }
        c[3*i + j] = cij;
      }
    }
    return c;
  }
  function multmv(m, v) { // multiply matrix and vector
    return [
      m[0]*v[0] + m[1]*v[1] + m[2]*v[2],
      m[3]*v[0] + m[4]*v[1] + m[5]*v[2],
      m[6]*v[0] + m[7]*v[1] + m[8]*v[2]
    ];
  }
  // function pdbg(m, v) {
  //   var r = multmv(m, v);
  //   return r + " (" + r[0]/r[2] + ", " + r[1]/r[2] + ")";
  // }
  function basisToPoints(x1, y1, x2, y2, x3, y3, x4, y4) {
    var m = [
      x1, x2, x3,
      y1, y2, y3,
      1,  1,  1
    ];
    var v = multmv(adj(m), [x4, y4, 1]);
    return multmm(m, [
      v[0], 0, 0,
      0, v[1], 0,
      0, 0, v[2]
    ]);
  }
  function general2DProjection(
    x1s, y1s, x1d, y1d,
    x2s, y2s, x2d, y2d,
    x3s, y3s, x3d, y3d,
    x4s, y4s, x4d, y4d
  ) {
    var s = basisToPoints(x1s, y1s, x2s, y2s, x3s, y3s, x4s, y4s);
    var d = basisToPoints(x1d, y1d, x2d, y2d, x3d, y3d, x4d, y4d);
    return multmm(d, adj(s));
  }
  function project(m, x, y) {
  var v = multmv(m, [x, y, 1]);
  return [v[0]/v[2], v[1]/v[2]];
  }


  // projection #1
  var srcTopLeftX = 0;
  var srcTopLeftY = 0;
  var srcTopRightX = IMAGESIZE-1;
  var srcTopRightY = 0;
  var srcBotLeftX = 0;
  var srcBotLeftY = IMAGESIZE-1;
  var srcBotRightX = IMAGESIZE-1;
  var srcBotRightY = IMAGESIZE-1;

  var dstTopLeftX = destPoints[0];
  var dstTopLeftY = destPoints[1];
  var dstTopRightX = destPoints[2];
  var dstTopRightY = destPoints[3];
  var dstBotLeftX = destPoints[4];
  var dstBotLeftY = destPoints[5];
  var dstBotRightX = destPoints[6];
  var dstBotRightY = destPoints[7];

  var m = general2DProjection(
    srcTopLeftX, srcTopLeftY, dstTopLeftX, dstTopLeftY,
    srcTopRightX, srcTopRightY, dstTopRightX, dstTopRightY,
    srcBotLeftX, srcBotLeftY, dstBotLeftX, dstBotLeftY,
    srcBotRightX, srcBotRightY, dstBotRightX, dstBotRightY
  )


  var x_increment = 1;
  if (srcTopRightX - dstTopLeftX <= IMAGESIZE/2) {
    x_increment = 2;
  }

  var y_increment = 1;
  if (srcBotLeftY - srcTopLeftY <= IMAGESIZE/2) {
    y_increment = 2;
  }

  for (var x = srcTopLeftX; x < srcTopRightX; x = x + x_increment) {
    for (var y = srcTopLeftY; y < srcBotLeftY; y = y + y_increment) {

      var srcXY = project(m, x, y);

      samp_y = y;
      samp_x = x;

      var sampRGB = image.getcell(samp_x, samp_y);
      output_matrix.setcell2d(srcXY[0], srcXY[1], 255, sampRGB[1], sampRGB[2], sampRGB[3]);
    }
  }

};







