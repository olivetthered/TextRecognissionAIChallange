var processor = Object();
//FIXME: matchDropout is being used so it drops out when count  matched is reached. really it should drop out when the relevant grid number is reached.
processor.doLoad = function doLoad(overRuntollerance, minimumGridSpacingToAllowOverruns, numberOfGrids, maximumConsecutiveOverrunBlocks, overRurnPenelty, matchDropout, filter) {

    this.sourceimage = document.getElementById('myimage');
    this.canvas1 = document.getElementById('canvas1');
    this.canvas2 = document.getElementById('canvas2');
    this.characters = document.getElementById('characters');
    this.canvas2.width = this.canvas1.width = document.getElementById('myimage').naturalWidth;
    this.canvas2.height = this.canvas1.height = document.getElementById('myimage').naturalHeight;

    this.ctx1 = this.canvas1.getContext('2d');
    this.ctx1.drawImage(this.sourceimage, 0, 0);
    this.sourceimageCtx = this.ctx1;
    
    this.ctx2 = this.canvas2.getContext('2d');
    let self = this;

    let frame = this.ctx1.getImageData(0, 0, this.canvas1.width, this.canvas1.height);//this.ctx1.getImageData(0, 0, this.width, this.height);

    let width = this.canvas1.width;
    frame.width = this.canvas1.width;
    let height = this.canvas1.height;

/*
* preprocessing, filter the image to remove unwanted, say, color, information. currently the frame data is required to be black on white for processing.
 * you may want to deskew the image so that the columns and tables are accurately identified using as basic linear algorithm.
*
* */
    let skewRect = new Object();
    skewRect.x1 = 0;
    skewRect.x2 = 0;
    skewRect.y1 = 0;
    skewRect.y2 = height;
    deskew(frame, skewRect, width);

    filterFrame(frame, filter);


    
    //this.sourceimageCtx.scale(0.75, 0.75);
    this.sourceimageCtx.putImageData(frame, 0, 0);
    //this.sourceimageCtx.scale(1, 1);

    //tolerance = 3,4, 9, 2, 1, 40; //This is the cut off tolerance for the number of non-empty cells
    //on a row or column for the row or column to be flagged as significant. the higher the value the tighter the fit has to be.
    //It may be a good idea to start out quite high and see what matches then drop it down too see if there's a broader fit.

    /*
     *
     *  Scan the image with a binary grid matrix of ever decreasing box width. Each iteration there are twice as many element in the matrix.
     *  some optimizations for marking a cell as populated or not based on the status of the parent cell have been implemented.
     *  */
    theGrids = [];
    theGrids.length = 40;
    theColRowTotals = [];
    theColRowTotals.length = 40;
    grid = 0;
    for (gridSpacing = 2;
        gridSpacing <= Math.pow(2, numberOfGrids);
        gridSpacing = gridSpacing * 2) {

        /*
         * 
         * Allocate grid and it's basic arrays for rows and columns.
         * */
        theGrids[grid] = [];
        theGrids[grid].length = gridSpacing * gridSpacing;
        theColRowTotals[grid] = Object();
        theColRowTotals[grid].colTotals = [];
        theColRowTotals[grid].colTotals.length = gridSpacing;
        theColRowTotals[grid].rowTotals = [];
        theColRowTotals[grid].rowTotals.length = gridSpacing;

        let theGrid = theGrids[grid];

        /*
         * Look to see if the grid cell is empty of contains data.
         * 
         * */
        py = 0;
        for (gy = 0; gy < height; gy = gy + (height / gridSpacing)) {
            px = 0;
            igy = Math.floor(gy);
            iww = Math.floor(height / gridSpacing);
            for (gx = 0; gx < width; gx = gx + (width / gridSpacing)) {

                igx = Math.floor(gx);
                iwh = Math.floor(width / gridSpacing);

                //Test to see if there is anything inside the matrix element

                hasSpot = Object();
                if (grid > 0) {
                    // If the matrix element contained nothing on the previous run then don't bother checking it again this time
                    if (theGrids[grid - 1][Math.floor(px / 2) + Math.floor(py / 2) * gridSpacing / 2].x != -1) {
                        hasSpot = testSquare(frame, igx, igy, iwh, iww, hasSpot)
                    }
                    else {
                        hasSpot.x = -1;
                        hasSpot.y = -1;
                    }
                } else {
                    hasSpot.x = -1;
                    hasSpot.y = -1;
                    hasSpot = testSquare(frame, igx, igy, iwh, iww, hasSpot)
                }
                theGrid[px + py * gridSpacing] = hasSpot;

                //Draw a little dot on the frame image so we know we have done something
                if (hasSpot.x != -1) {
                    /*
                                            frame.data[(igx  + igy   * frame.width) * 4 + R] = 0;
                                            frame.data[(igx +  igy * frame.width) * 4 + G] = 128;
                                            frame.data[(igx  + igy  * frame.width) * 4 + B] = 128;
                                            frame.data[(igx  + igy * frame.width) * 4 + A] = 255;
                    
                                            frame.data[(igx + Math.floor((width/ gridSpacing)/ 2) + (igy +Math.floor((height/ gridSpacing)/ 2))  * frame.width) * 4 + R] = 255;
                                            frame.data[(igx + Math.floor((width/ gridSpacing)/ 2) +  (igy +Math.floor((height/ gridSpacing)/ 2)) * frame.width) * 4 + G] = 0;
                                            frame.data[(igx + Math.floor((width/ gridSpacing)/ 2) +  (igy +Math.floor((height/ gridSpacing)/ 2)) * frame.width) * 4 + B] = 0;
                                            frame.data[(igx + Math.floor((width/ gridSpacing)/ 2) +  (igy +Math.floor((height/ gridSpacing)/ 2)) * frame.width) * 4 + A] = 255;
                    
                                            frame.data[(hasSpot.x + hasSpot.y * frame.width) * 4 + R] = 255;
                                            frame.data[(hasSpot.x +  hasSpot.y * frame.width) * 4 + G] = 0;
                                            frame.data[(hasSpot.x +  hasSpot.y  * frame.width) * 4 + B] = 255;
                                            frame.data[(hasSpot.x +  hasSpot.y  * frame.width) * 4 + A] = 255;
                    */

                }
                px++;
            }
            py++;
        }

        /*
         * Fairly simple scan-line test for clear blocks and blocks with obstacles, by col then by row. the code for both is nearly identical so could easily be optimized out.
         * Some optimizations have been done which blacklist child rows and cols if the parent row/col fell within the tolerance to count as a match.
         *      This basically stops double counting and keeps the granularity to a minimum.
         * 
         */
        //Now that we've identified all the matrix cells that contain something in this iteration
        //Count how many celled contained something by each row and column
        function threasholdTest(total, grid) {
            if (total === 0 || total === 9999999999 || (total < overRuntollerance && grid >= minimumGridSpacingToAllowOverruns))
                return true;
            return false;
        }

        for (elm = 0; elm < gridSpacing; elm++) {
            //this bit can be optimized by passing the correct array, col or row
            if (grid > 0 && elm % 2 === 0) {
                // The overlapping column on the previous grid was below the threshold, so set this one not to double count
                const prevColTotal = theColRowTotals[grid - 1].colTotals[elm >> 1];

                if (threasholdTest(prevColTotal, grid) === true) {
                    theColRowTotals[grid].colTotals[elm] = 9999999999;
                    elm++;
                    theColRowTotals[grid].colTotals[elm] = 9999999999;
                    continue;
                }
            }

            //this is the scan-line bit, it can be optimized by passing the reliant function to perform the inner lookup theGrid[elmX + elm * gridSpacing].x or theGrid[elm + elmX * gridSpacing].x, so basically needs to calculate either elmX + elm * gridSpacing or elm + elmX * gridSpacing
            elmTotal = 0;
            elmX = 0;
            while (elmX < gridSpacing) {
                while (elmX < gridSpacing && theGrid[elmX + elm * gridSpacing].x === -1) {
                    elmX++
                }
                if (elmX < gridSpacing) {
                    blockCount = 0;
                    while (elmX < gridSpacing && theGrid[elmX + elm * gridSpacing].x != -1) {
                        blockCount++
                        elmX++
                    }
                    if (blockCount >= maximumConsecutiveOverrunBlocks) {
                        elmTotal = elmTotal + blockCount - overRurnPenelty;
                    }
                    elmTotal++;
                }
            }
            theColRowTotals[grid].colTotals[elm] = elmTotal;
        }

        for (elm = 0; elm < gridSpacing; elm++) {
            if (grid > 0 && elm % 2 === 0) {
                const prevColTotal = theColRowTotals[grid - 1].rowTotals[elm >> 1];
                // The overlapping row on the previous grid was below the threshold, so set this one not to double count
                if (threasholdTest(prevColTotal, grid))  {
                    theColRowTotals[grid].rowTotals[elm] = 9999999999;
                    elm++;
                    theColRowTotals[grid].rowTotals[elm] = 9999999999;
                    continue;
                }
            }
            elmTotal = 0;
            elmX = 0;
            while (elmX < gridSpacing) {
                while (elmX < gridSpacing && theGrid[elm + elmX * gridSpacing].x === -1) {
                    elmX++
                }
                //rowTotal--;
                if (elmX < gridSpacing) {
                    blockCount = 0;
                    while (elmX < gridSpacing && theGrid[elm + elmX * gridSpacing].x != -1) {
                        blockCount++
                        elmX++
                    }
                    if (blockCount >= 2) {
                        elmTotal = elmTotal + blockCount - 1;
                    }
                    elmTotal++;
                }
            }
            theColRowTotals[grid].rowTotals[elm] = elmTotal;
        }



        //move onto the next grid (we could bail out if we've had enough rows/cols within tolerance )
        grid++;
    }

    grids = grid;
    matchedRowCols = [];

    /*finally, iterate over all the row col totals and identify those that are within tolerance and add them to a list of candidate row and columns for layout fitting
    * In theory it's possible to check the row and column counts against the tolerance and add them to the list when they are calculated
    * Then if we get enough entries early we can bail out of the grid matrix test early
    * That would also mean there's no need to go over them here.. I may fix this bug.
    * */
    for (grid = 0; grid < grids; grid++) {
        let theColRowTotal = theColRowTotals[grid];
        colRowFitcount = 0;
        entries = theColRowTotal.rowTotals.length;
        for (entry = 0; entry < entries; entry++) {
            /*
             * FIXME:Use a standard tolerance checking function
             * and optimize the code out so it uses the relevant rowTotals or colTotals array and the "row" "col" identification flag.
             * */
            if (theColRowTotal.colTotals[entry] === 0 || (grid >= minimumGridSpacingToAllowOverruns && theColRowTotal.colTotals[entry] < overRuntollerance)) {
                matchedRowCols.length = matchedRowCols.length + 1;
                matchedRowCols[matchedRowCols.length - 1] = Object();
                let matchedRowCol = matchedRowCols[matchedRowCols.length - 1];
                matchedRowCol.total = theColRowTotal.colTotals[entry];
                matchedRowCol.grid = grid;
                matchedRowCol.entry = entry;
                matchedRowCol.rowcol = "col";
                matchedRowCol.count = theColRowTotal.colTotals[entry];
                matchedRowCol.entries = entries;
                matchedRowCols[matchedRowCols.length - 1] = matchedRowCol;
            }
            if (theColRowTotal.rowTotals[entry] === 0 || (grid > minimumGridSpacingToAllowOverruns && theColRowTotal.rowTotals[entry] < overRuntollerance)) {
                matchedRowCols.length = matchedRowCols.length + 1;
                matchedRowCols[matchedRowCols.length - 1] = Object();
                let matchedRowCol = matchedRowCols[matchedRowCols.length - 1];
                matchedRowCol.total = theColRowTotal.rowTotals[entry];
                matchedRowCol.grid = grid;
                matchedRowCol.entry = entry;
                matchedRowCol.rowcol = "row";
                matchedRowCol.count = theColRowTotal.rowTotals[entry];
                matchedRowCol.entries = entries;
                matchedRowCols[matchedRowCols.length - 1] = matchedRowCol;
            }
        }
        if (matchedRowCols.length > matchDropout) //this should probably be a grid number
        {
            break;
        }
    }

    /*
     * * and finally render the resulting row/column grid.
     * *
     * */
    this.ctx2.putImageData(frame, 0, 0);
    
    for (matchedRC = 0; matchedRC < matchedRowCols.length; matchedRC++) {
        renderRowCol(this.ctx2, frame, matchedRowCols[matchedRC]);
    }
    /*
     *  The last remaining component is to:
     *      calculate the border areas of the tables, 
     *      identify the areas that contain data
     *      process that data to see if it's text or something else.
     * 
     * */

    borders = calculateBorders(matchedRowCols);

    /*
     * *
     * * You may want, as an additional step, to run the tabular layout detection again, but within a cell/cells row or column area of interest.
     * So 'sub tables' can be detected and fancy borders can be removed and inner content processed.
     * I would suggest something like a density function. to identify areas with excess white and black space compared to the mean black/white space by row or column for character data.
     * That will then give you an estimate of the numbers of characters in as row or column, text may be too bright to too dirty which would skew the result from the true mean for the character data.
     * *
     * */
    occupiedRowCols = calculateOccuipiedRowColsFromMatchedRowCols(borders, matchedRowCols);
    loadCharachers();
    text = recognizeCharacters(frame, occupiedRowCols);

    //this.ctx2.putImageData(frame, 0, 0);

};

/*
 * 
 * Identify the matched rows and columns that make up the border areas.
 * 
 * */

function findEdges(matchedRowCols) {
    grid = 0;
    mincol = [];
    mincol.length = maxcol.length = minrow.length = maxrow.length = grids + 1;
    maxcol = [];
    //maxcol.length = grids + 1;
    minrow = [];
    //minrow.length = grids + 1;
    maxrow = [];
    //maxrow.length = grids + 1;
    for (n = 0; n < grids; n++) {
        maxrow[n] = maxcol[n] = 100;
        //mincol[n] = -1;
        //maxrow[n] = 100;
        mincol[n] = minrow[n] = -1;
    }

    for (n = 0; n < matchedRowCols.length; n++) {
        grid = matchedRowCols[n].grid;
        if (matchedRowCols[n].rowcol === "col") {
            if (n < mincol[grid]) {
                mincol[grid] = n;
            }
            if (n > maxcol[grid]) {
                maxcol[grid] = n;
            }
        } else if (matchedRowCols[n].rowcol === "row") {
            if (n < minrow[grid]) {
                minrow[grid] = n;
            }
            if (n > maxrow[grid]) {
                maxrow[grid] = n;
            }
        }
    }
    for (n = 0; n < grids; n++) {

        if (mincol[n] != -1) {
            matchedRowCol = matchedRowCols[mincol[n]];
            if (matchedRowCol.entry === 0 || n > 0 && matchedRowCol.entry === ((matchedRowCols[mincol[n - 1]].entry + 1) * 2) + 1)
                matchedRowCols[mincol[n]] = "leftCol";

        }
        if (minrow[n] != -1) {
            matchedRowCol = matchedRowCols[minrow[n]];
            if (matchedRowCol.entry === 0 || n > 0 && matchedRowCol.entry === ((matchedRowCols[minrow[n - 1]].entry + 1) * 2) + 1)
                matchedRowCols[minrow[n]] = "topRow";

        }
        if (maxcol[n] != 100) {
            matchedRowCol = matchedRowCols[maxcol[n]];
            if (matchedRowCol.entry === Math.pow(2, n) || n > 0 && matchedRowCol.entry === ((matchedRowCols[maxcol[n - 1]].entry + 1) * 2) - 1)
                matchedRowCols[maxcol[n]] = "rightCol";

        }
        if (maxrow[n] != 100) {
            matchedRowCol = matchedRowCols[maxrow[n]];
            if (matchedRowCol.entry === Math.pow(2, n) || n > 0 && matchedRowCol.entry === ((matchedRowCols[maxrow[n - 1]].entry + 1) * 2) - 1)
                matchedRowCols[maxrow[n]] = "bottomRow";

        }
    }
}

/*
 * Output the results of row and column table matching.
 * 
 * */

function renderRowCol(cctx, frame, matchedRowCol) {

    colour = [255, 0, 0, 255];
    scale = Math.pow(2, matchedRowCol.grid + 1);
    x1 = 0;
    y1 = 0;
    x2 = 0;
    y2 = 0;
    if (matchedRowCol.rowcol === "col") {
        scale = frame.height / scale;
        //x1 = 0;
        x2 = frame.width;
        y1 = Math.floor(matchedRowCol.entry * scale);
        y2 = Math.floor((matchedRowCol.entry + 1) * scale);
    } else {
        scale = frame.width / scale;
        //y1 = 0;
        y2 = frame.height;
        x1 = Math.floor(matchedRowCol.entry * scale) - 1;
        x2 = Math.floor((matchedRowCol.entry + 1) * scale) - 1;
    }
    cctx.beginPath();
    //cctx.fill()
    cctx.fillStyle = "#FFFF00";
    if (matchedRowCol.total === 0)
        cctx.fillStyle = "#FF0000";
    if (matchedRowCol.total === 1)
        cctx.fillStyle = "#00FF00";
    if (matchedRowCol.total === 2)
        cctx.fillStyle = "#0000FF";

    cctx.rect(x1, y1, x2 - x1, y2 - y1);
    cctx.lineWidth = 1;
    cctx.fill();

}

/*
 * 
 * Here are a couple of histogram and the main filter function which can be used as one way of turning the scanned document into a black and white image needed for the rest of the code.
 * 
 */
function filterFrame(frame, filter)
{
    let l = frame.data.length / 4;
    let R = 0;
    let G = 1;
    let B = 2;
    let A = 3;


    if (filter) {
        //Filter the source image to remove all the non-text that we are not interested in.
        for (let i = 0; i < l; i++) {
            let r = frame.data[i * 4 + 0];
            let g = frame.data[i * 4 + 1];
            let b = frame.data[i * 4 + 2];
            let alpha = frame.data[i * 4 + 3];
            if (r > 22 && r <= 24 && g > 20 && g <= 22 && b > 20 && b <= 25) {

                r = 0;
                g = 0;
                b = 0;
                alpha = 255;

            } else {
                r = 255;
                g = 255;
                b = 255;
                alpha = 255;
            }
            frame.data[i * 4 + R] = r;
            frame.data[i * 4 + G] = g;
            frame.data[i * 4 + B] = b;
            frame.data[i * 4 + A] = alpha;
        }
    } else {
        //Filter the source image to remove all the non-text that we are not interested in.
        for (let i = 0; i < l; i++) {
            let r = frame.data[i * 4 + 0];
            let g = frame.data[i * 4 + 1];
            let b = frame.data[i * 4 + 2];
            let alpha = frame.data[i * 4 + 3];
            if (r >= 0 && r <= 240 && g >= 0 && g <= 240 && b >= 0 && b <= 240) {

                r = 0;
                g = 0;
                b = 0;
                alpha = 255;

            } else {
                r = 255;
                g = 255;
                b = 255;
                alpha = 255;
            }
            frame.data[i * 4 + R] = r;
            frame.data[i * 4 + G] = g;
            frame.data[i * 4 + B] = b;
            frame.data[i * 4 + A] = alpha;
        }
    }
}

// Here's a simple 12bit colour space histogram function that takes histSamples random samples from the source frame
function buildHistogram12(frame, histSamples) {

    //build a histogram going from a 32bit colour space down to a 12 bit colour space.
    let result = new Object[4096];
    for (let counter = 0; counter < result.length; counter++) {
        result[counter] = BigInt(0);
    }
    const framepixels = frame.length >> 2;
    //if you want to use the entire frame as a  sample space.
    //for (framePointer = 0; framePointer < frame.length; framePointer +=4)
    for (let sample = 0; sample < histSamples; sample++)
    { 
        let framePixel = randomInt(framepixels);
        framePointer = framePixel << 2;
        let r = BigInt(frame[framePointer]);
        let g = BigInt(frame[framePointer + 1]);
        let b = BigInt(frame[framePointer + 2]);
        let a = BigInt(frame[framePointer + 3]);
        histCol = BigInt(((r & 0xFF) >> 5) | (((g & 0xFF) >> 5) << 3) | (((b & 0xFF) >> 5) << 6) | (((a & 0xFF) >> 5) << 9));
        result[histCol]++;
    }
    return result;
}

//Here's a simple 8bit colour space histogram function that takes histSamples random samples from the source frame
function buildHistogram8(frame, histSamples) {

    //build a histogram going from a 32bit colour space down to a 12 bit colour space.
    let result = new Object[256];
    for (let counter = 0; counter < result.length; counter++) {
        result[counter] = BigInt(0);
    }
    const framepixels = frame.length >> 2;
    //for (framePointer = 0; framePointer < frame.length; framePointer +=4)
    for (let sample = 0; sample < histSamples; sample++) {
        let framePixel = randomInt(framepixels);
        framePointer = framePixel << 2;
        let r = BigInt(frame[framePointer]);
        let g = BigInt(frame[framePointer + 1]);
        let b = BigInt(frame[framePointer + 2]);
        let a = BigInt(frame[framePointer + 3]);
        histCol = BigInt(((r & 0xFF) >> 6) | (((g & 0xFF) >> 6) << 2) | (((b & 0xFF) >> 6) << 4) | (((a & 0xFF) >> 6) << 6));
        result[histCol]++;
    }
    return result;
}

/*
 * See if there is any data within the bounds of the grid square.
 * 
 * */
function testSquare(frame, left, top, width, height, hasSpot) {
    if (hasSpot.x >= left + width && hasSpot.y >= top + height) {
        hasSpot.x = -1;
        hasSpot.y = -1;
        return hasSpot;
    } else if (hasSpot.x >= left && hasSpot.x < left + width) {
        if (hasSpot.y >= top && hasSpot.y < top + height) {
            return hasSpot;
        } else {
            hasSpot.x = left;
            hasSpot.y = top;
        }
    } else {
        if (hasSpot.y >= top && hasSpot.y < top + height) {
            hasSpot.x = left;
        } else {
            hasSpot.x = left;
            hasSpot.y = top;
        }
    }
    for (y = hasSpot.y; y < top + height; y++) {
        for (x = left; x < left + width; x++) {
            if (getPixel(x, y, frame)[0] === 0) {
                hasSpot.y = y;
                hasSpot.x = x;
                return hasSpot;
            }
        }
    }
    hasSpot.x = -1;
    hasSpot.y = -1;
    return hasSpot;
}

/* draw and return a pixel from the frame.
 * 
 * */
function drawPixel(x, y, frame, colour) {
    frame.data[(x + y * frame.width) * 4] = colour[0];
    frame.data[(x + y * frame.width) * 4 + 1] = colour[1];
    frame.data[(x + y * frame.width) * 4 + 2] = colour[2];
    frame.data[(x + y * frame.width) * 4 + 3] = colour[3];
}

function getPixel(x, y, frame) {

    return [frame.data[(x + y * frame.width) * 4],
    frame.data[(x + y * frame.width) * 4 + 1],
    frame.data[(x + y * frame.width) * 4 + 2],
    frame.data[(x + y * frame.width) * 4 + 3]]
}


/*
 * * Functions that are empty stubs to be implemented.
 * *
 * *
 * *
 */
function deskew(frame, skewRomb, width) {
    /*
     * Given a rhombus? describing the 'best' for horizontal and vertical for say the edges and the middle of the document (or whatever fits)
     * Remove the represented 'skew' for the frame, hopefully, returning a document with nice parallel, horizontal lines of text in it for us to process.
     * */
}

/* this function sees if the standard spaced grid will fit in the areas that appear to have been identfied as non-space areas by offsetting the top, left of the grid to see if it fits */
function tryToFitBlanks() {

}

function calculateOccuipiedRowColsFromMatchedRowCols(borders, matchedRowCols) {
    //basically invert matchedRowCols
    return new Object;
}
function loadCharachers() {
    //load all the characters from the TTF to use for pattern matching
}

function recognizeCharacters(frame, occupiedRowCols) {
    return new Object;
}

function calculateBorders(matchedRowCols) {
    result = findEdges(matchedRowCols);
    return new Object;
}