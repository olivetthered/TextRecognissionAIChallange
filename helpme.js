/*
 * * Functions that are empty stubs to be implemented.
 * *
 * *
 * *
 */
/**
 * 
 * Preprocessing functions
 * 
 * 
/*
* preprocessing, filter the image to remove unwanted, say, color, information. currently the frame data is required to be black on white for processing.
 * you may want to deskew the image so that the columns and tables are accurately identified using as basic linear algorithm.
*
* */
export function deskew(frame, skewRomb) {
    /*
     * Given a rhombus? describing the 'best' for horizontal and vertical for say the edges and the middle of the document (or whatever fits)
     * Remove the represented 'skew' for the frame, hopefully, returning a document with nice parallel, horizontal lines of text in it for us to process.
     * */
}


/*
 *
 * Here are a couple of histogram and the main filter function which can be used as one way of turning the scanned document into a black and white image needed for the rest of the code.
 * histogram functions added which may be useful for filtering the page to adjust any colour, brightness or saturation variations and or to identify
 * 'banding' in the histogram that indicates a difference in colour between desirable and undesirable content. desirable content, when bound to an area, should have a discernible density profile.
 * The filter frame function i have implemented hear uses a colour range picking technique, which removes undesirable content from 2020-07-02 (12).png
 *  or a 'brightness' range technique to blacken up gray areas of documents such as Screen-shot 2020-12-04 085656.png that are already black and white.
 *  I'd expect that you'd want to calculate HSVA values for the histogram entries instead of RGBA.
 *  the alpha channel is redundant in the input for this exercise so you may want to hijack it to store extra information about each pixel without having to deal with a whole other array for it.
 *
 */

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
    for (let sample = 0; sample < histSamples; sample++) {
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

/**
 *
 * Content identification functions
 *
 *
/*
/*
 * *
 * * Here are some functions to calculate the density of data within a cell row or column.
 * *
 * */
/*
* *
* * There should be an overall density 'sweet spot or two', which are 1 character width and height and one character horizontal and vertical spacing
*   Rows and columns may also have some degree of harmonized density which could be used to further refiner tabular layouts.
* *
* */
/*
 * *
 * * You may want, as an additional step, to run the tabular layout detection again, but within a cell/cells row or column area of interest.
 * So 'sub tables' can be detected and fancy borders can be removed and inner content processed.
 * I would suggest something like a density function. to identify areas with excess white and black space compared to the mean black/white space by row or column for character data.
 * That will then give you an estimate of the numbers of characters in as row or column, text may be too bright to too dirty which would skew the result from the true mean for the character data.
 * *
 * */

/*
 * *
 * * Functions you may want for iterative tablur analysis, to identify sub-tables and exclude 'fancy borders', may also help with identifying areas that don't have a uniform row/column layout such as graphical content.
 * *
 * */
/* this function sees if the standard spaced grid will fit in the areas that appear to have been identified as non-space areas by offsetting the top, left of the grid to see if it fits */
function tryToFitBlanks() {

}