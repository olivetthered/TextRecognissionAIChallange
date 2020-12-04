var processor = Object();
processor.doLoad = function doLoad(overRuntollerance, minimumGridSpacingToAllowOverruns, numberOfGrids, maximumConsecutiveOverrunBlocks, overRurnPenelty, matchDropout, filter) {

    this.sourceimage = document.getElementById('myimage');
    this.canvas1 = document.getElementById('canvas1');
    this.canvas2 = document.getElementById('canvas2');
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
            x = i % width;
            y = (i - x) / width;
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
            x = i % width;
            y = (i - x) / width;
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
    //this.sourceimageCtx.scale(0.75, 0.75);
    this.sourceimageCtx.putImageData(frame, 0, 0);
    //this.sourceimageCtx.scale(1, 1);

    //tollerance = 3,4, 9, 2, 1, 40; //This is the cut off tollarance for the number of non-empty cells
    //on a row or column for the row or column to be flagged as significant. the higher the value the tighter the fit has to be.
    //It may be a good idea to start out quite high and see what matches then drop it down too see if there's a broader fit.

    // Scan the image with a grid matrix of ever decreasing box width. Ech itteration there are twice as many element in the matrix.
    theGrids = [];
    theGrids.length = 40;
    theColRowTotals = [];
    theColRowTotals.length = 40;
    grid = 0;
    for (gridSpacing = 2;
        gridSpacing <= Math.pow(2, numberOfGrids);
        gridSpacing = gridSpacing * 2) {
        theGrids[grid] = [];
        theGrids[grid].length = gridSpacing * gridSpacing;
        theColRowTotals[grid] = Object();
        theColRowTotals[grid].colTotals = [];
        theColRowTotals[grid].colTotals.length = gridSpacing;
        theColRowTotals[grid].rowTotals = [];
        theColRowTotals[grid].rowTotals.length = gridSpacing;
        let theGrid = theGrids[grid];
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
                    // If the matrix element contained nothing on the pervious run then dopn't bother checking it again this time
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
        //Now that we've identified all the matrix cells that contain something in this itteration
        //Count how many cellsd contained sopmething bhy each row and column
        for (col = 0; col < gridSpacing; col++) {
            if (grid > 0 && col % 2 === 0) {
                // The overlapping column on the previous grid was below the threashold, so set this one not to double count
                if (theColRowTotals[grid - 1].colTotals[col / 2] === 0 || (grid >= minimumGridSpacingToAllowOverruns && theColRowTotals[grid - 1].colTotals[col / 2] < overRuntollerance) || theColRowTotals[grid - 1].colTotals[col / 2] === 9999999999) {
                    theColRowTotals[grid].colTotals[col] = 9999999999;
                    col++;
                    theColRowTotals[grid].colTotals[col] = 9999999999;
                    continue;
                }
            }
            /*
            colTotal = 0;
            for(row = 0; row < gridSpacing; row ++){
            if(theGrid[row + col * gridSpacing].x != -1)
                colTotal++;//= theGrid[row + col * gridSpacing]
            }
            theColRowTotals[grid].colTotals[col] = colTotal;
            */
            colTotal = 0;
            row = 0;
            while (row < gridSpacing) {
                while (row < gridSpacing && theGrid[row + col * gridSpacing].x === -1) {
                    row++
                }
                if (row < gridSpacing) {
                    blockCount = 0;
                    while (row < gridSpacing && theGrid[row + col * gridSpacing].x != -1) {
                        blockCount++
                        row++
                    }
                    if (blockCount >= maximumConsecutiveOverrunBlocks) {
                        colTotal = colTotal + blockCount - overRurnPenelty;
                    }
                    colTotal++;
                }
            }
            theColRowTotals[grid].colTotals[col] = colTotal;
        }

        for (row = 0; row < gridSpacing; row++) {
            if (grid > 0 && row % 2 === 0) {
                // The overlapping row on the previous grid was below the threashold, so set this one not to double count
                if (theColRowTotals[grid - 1].rowTotals[row / 2] === 0 || (grid > minimumGridSpacingToAllowOverruns && theColRowTotals[grid - 1].rowTotals[row / 2] < overRuntollerance) || theColRowTotals[grid - 1].rowTotals[row / 2] === 9999999999) {
                    theColRowTotals[grid].rowTotals[row] = 9999999999;
                    row++;
                    theColRowTotals[grid].rowTotals[row] = 9999999999;
                    continue;
                }
            }
            rowTotal = 0;
            col = 0;
            while (col < gridSpacing) {
                while (col < gridSpacing && theGrid[row + col * gridSpacing].x === -1) {
                    col++
                }
                //rowTotal--;
                if (col < gridSpacing) {
                    blockCount = 0;
                    while (col < gridSpacing && theGrid[row + col * gridSpacing].x != -1) {
                        blockCount++
                        col++
                    }
                    if (blockCount >= 2) {
                        rowTotal = rowTotal + blockCount - 1;
                    }
                    rowTotal++;
                }
            }
            theColRowTotals[grid].rowTotals[row] = rowTotal;
        }
        //move ontio the next grid (we could bail out if we've had enough rows/cols within tollerance )
        grid = grid + 1;
    }

    grids = grid;
    matchedRowCols = [];
    //finally, itterate over all the row col totals and identify those that are within tollarance and add them tyo a list of candidate row and columns for layout fitting
    //In theory it's possible to check the row and column couints against the tollarance and add them to the list when they are calculated
    //Then if we get enough entries early we can bail out of the grid matrix test early
    //That would also mean there's no need to go over them here.. I may fix this bug.
    for (grid = 0; grid < grids; grid++) {
        let theColRowTotal = theColRowTotals[grid];
        colRowFitcount = 0;
        entries = theColRowTotal.rowTotals.length;
        for (entry = 0; entry < entries; entry++) {
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
    
    for (matchedRC = 0; matchedRC < matchedRowCols.length; matchedRC++) {
        renderRowCol(this.ctx2, frame, matchedRowCols[matchedRC]);
    }

    for (matchedRC = 0; matchedRC < matchedRowCols.length; matchedRC++) {
        renderRowCol2(this.ctx2, frame, matchedRowCols[matchedRC]);
    }

    this.ctx2.putImageData(frame, 0, 0);

};

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
/* this function sees if the standard spaced grid will fit in the areas that appear to have been identfied as non-space areas by offsetting the top, left of the grid to see if it fits */
function tryToFitBlanks() {

}
function renderRowCol2(cctx, frame, matchedRowCol) {

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
        x1 = Math.floor(matchedRowCol.entry * scale);
        x2 = Math.floor((matchedRowCol.entry + 1) * scale);
    }
    cctx.fillRect(x1, y1, x2, y2);

}

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
    y = y1;
    for (x = x1; x < x2; x++) {
        drawPixel(x, y, frame, colour);
    }
    x = x2 - 1;
    for (y = y1; y < y2; y++) {
        drawPixel(x, y, frame, colour);
    }
    y = y2 - 1;
    for (x = x1; x < x2; x++) {
        drawPixel(x, y, frame, colour);
    }
    x = x1;
    for (y = y1; y < y2; y++) {
        drawPixel(x, y, frame, colour);
    }
}

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