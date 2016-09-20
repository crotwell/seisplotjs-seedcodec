/**
 * Philip Crotwell
 * University of South Carolina, 2014
 * http://www.seis.sc.edu
 */
// converted from Steim2.java in seedCodec
// http://code.google.com/p/seedcodec/
        

  
// constants for compression types

/** ascii */
  var ASCII = 0;

/** 16 bit integer, or java short */
  var SHORT = 1;

/** 24 bit integer */
  var INT24 = 2;

/** 32 bit integer, or java int */
  var INTEGER = 3;

/** ieee float */
  var FLOAT = 4;

/** ieee double*/
  var DOUBLE = 5;

/** Steim1 compression */
  var STEIM1= 10;

/** Steim2 compression */
  var STEIM2 = 11;
    
/** CDSN 16 bit gain ranged */
  var CDSN = 16;
        
/** (A)SRO */
  var SRO = 30;
    
/** DWWSSN 16 bit */
  var DWWSSN = 32;

  var steim1 = {};
  var steim2 = {};

  var decompress = function(compressionType, dataView, numSamples, littleEndian) {
    // in case of record with no data points, ex detection blockette, which often have compression type
    // set to 0, which messes up the decompresser even though it doesn't matter since there is no data.
    if (numSamples == 0) {
        return [];
    }

    var out = [];
    var offset = 0;
    var i;
    switch(compressionType){
        case SHORT:
        case DWWSSN:
            // 16 bit values
            if(dataView.length < 2 * numSamples) {
                throw new CodecException("Not enough bytes for "
                        + numSamples + " 16 bit data points, only "
                        + dataView.length + " bytes.");
            }
            for(i = 0; i < numSamples; i++) {
                out[i] = dataView.getInt16(offset, littleEndian);
                offset += 2;
            }
            break;
        case INTEGER:
            // 32 bit integers
            if(dataView.length < 4 * numSamples) {
                throw "Not enough bytes for "
                        + numSamples + " 32 bit data points, only "
                        + dataView.length + " bytes.";
            }
            for(i = 0; i < numSamples; i++) {
                out[i] = dataView.getInt32(offset, littleEndian);
                offset += 4;
            }
            break;
        case FLOAT:
            // 32 bit floats
            if(dataView.length < 4 * numSamples) {
                throw "Not enough bytes for "
                        + numSamples + " 32 bit data points, only "
                        + dataView.length + " bytes.";
            }
            for(i = 0; i < numSamples; i++) {
                out[i] = dataView.getFloat32(offset, littleEndian);
                offset += 4;
            }
            break;
        case DOUBLE:
            // 64 bit doubles
            if(b.length < 8 * numSamples) {
                throw "Not enough bytes for "
                        + numSamples + " 64 bit data points, only "
                        + dataView.length + " bytes.";
            }
            for(i = 0; i < numSamples; i++) {
                out[i] = dataView.getFloat64(offset, littleEndian);
                offset += 8;
            }
            break;
        case STEIM1:
            // steim 1
            out = steim1.decode(dataView, numSamples, littleEndian, 0);
            break;
        case STEIM2:
            // steim 2
            out = steim2.decode(dataView, numSamples, littleEndian, 0);
            break;   
        default:
            // unknown format????
            throw new UnsupportedCompressionType("Type " + type
                    + " is not supported at this time.");
    } // end of switch ()
    return out;
};
  

/**
 *  Decode the indicated number of samples from the provided byte array and
 *  return an integer array of the decompressed values.  Being differencing
 *  compression, there may be an offset carried over from a previous data
 *  record.  This offset value can be placed in <b>bias</b>, otherwise leave
 *  the value as 0.
 *  @param b input byte array to be decoded
 *  @param numSamples the number of samples that can be decoded from array
 *  <b>b</b>
 *  @param swapBytes if true, swap reverse the endian-ness of the elements of
 *  byte array <b>b</b>.
 *  @param bias the first difference value will be computed from this value.
 *  If set to 0, the method will attempt to use the X(0) constant instead.
 *  @return int array of length <b>numSamples</b>.
 *  @throws SteimException - encoded data length is not multiple of 64
 *  bytes.
 */
steim1.decode = function (dataView, numSamples, littleEndian, bias) {
    // Decode Steim1 compression format from the provided byte array, which contains numSamples number
    // of samples.  swapBytes is set to true if the value words are to be byte swapped.  bias represents
    // a previous value which acts as a starting constant for continuing differences integration.  At the
    // very start, bias is set to 0.
    if (dataView.byteLength % 64 != 0) {
        throw "encoded data length is not multiple of 64 bytes (" + b.length + ")"; 
    }
    var samples = [];
    var tempSamples;
    var numFrames = dataView.byteLength / 64;
    var current = 0;
    var start=0
    var end=0;
    var firstData=0;
    var lastValue = 0;
    var i, j;

    for (i=0; i< numFrames; i++ ) {
        tempSamples = extractSteim1Samples(dataView, i*64, littleEndian);   // returns only differences except for frame 0
        firstData = 0; // d(0) is byte 0 by default
        if (i==0) {   // special case for first frame
            lastValue = bias; // assign our X(-1)
            // x0 and xn are in 1 and 2 spots
            start = tempSamples[1];  // X(0) is byte 1 for frame 0
            end = tempSamples[2];    // X(n) is byte 2 for frame 0
            firstData = 3; // d(0) is byte 3 for frame 0
            // if bias was zero, then we want the first sample to be X(0) constant
            if (bias == 0) lastValue = start - tempSamples[3];  // X(-1) = X(0) - d(0)
        }
        for (j = firstData; j < tempSamples.length && current < numSamples; j++) {
            samples[current] = lastValue + tempSamples[j];  // X(n) = X(n-1) + d(n)
            lastValue = samples[current];
            current++;
        }
    }  // end for each frame...
    if (current != numSamples) {
        throw "Number of samples decompressed doesn't match number in header: "+current+" != "+numSamples;
    }
    // ignore last sample check???
    //if (end != samples[numSamples-1]) {
    //    throw new SteimException("Last sample decompressed doesn't match value x(n) value in Steim1 record: "+samples[numSamples-1]+" != "+end);
    //}
    return samples;
}
  
/**
 * Extracts differences from the next 64 byte frame of the given compressed
 * byte array (starting at offset) and returns those differences in an int
 * array.
 * An offset of 0 means that we are at the first frame, so include the header
 * bytes in the returned int array...else, do not include the header bytes
 * in the returned array.
 * @param bytes byte array of compressed data differences
 * @param offset index to begin reading compressed bytes for decoding
 * @param swapBytes reverse the endian-ness of the compressed bytes being read
 * @return integer array of difference (and constant) values
 */
function extractSteim1Samples(dataView, offset,  littleEndian) {
    /* get nibbles */
    var nibbles = dataView.getInt32(offset, littleEndian);
    var currNibble = 0;
    var temp = [];  // 4 samples * 16 longwords, can't be more than 64
    var currNum = 0;
    var i, n;
    for (i=0; i<16; i++) {   // i is the word number of the frame starting at 0
        //currNibble = (nibbles >>> (30 - i*2 ) ) & 0x03; // count from top to bottom each nibble in W(0)
        currNibble = (nibbles >> (30 - i*2) ) & 0x03; // count from top to bottom each nibble in W(0)
        //System.err.print("c(" + i + ")" + currNibble + ",");  // DEBUG
        // Rule appears to be:
        // only check for byte-swap on actual value-atoms, so a 32-bit word in of itself
        // is not swapped, but two 16-bit short *values* are or a single
        // 32-bit int *value* is, if the flag is set to TRUE.  8-bit values
        // are naturally not swapped.
        // It would seem that the W(0) word is swap-checked, though, which is confusing...
        // maybe it has to do with the reference to high-order bits for c(0)
        switch (currNibble) {
            case 0:
                //System.out.println("0 means header info");
                // only include header info if offset is 0
                if (offset == 0) {
                    temp[currNum++] = dataView.getInt32(offset+(i*4), littleEndian);
                }
                break;
            case 1:
                //System.out.println("1 means 4 one byte differences");
                for ( n=0; n<4; n++) {
                    temp[currNum] = dataView.getInt8(offset+(i*4)+n);
                    currNum++;
                }
                break;
            case 2:
                //System.out.println("2 means 2 two byte differences");
                for ( n=0; n<4; n+=2) {
                    temp[currNum] = dataView.getInt16(offset+(i*4)+n, littleEndian);
                    currNum++;
                }
                break;
            case 3:
                //System.out.println("3 means 1 four byte difference");
                temp[currNum++] =dataView.getInt32(offset+(i*4), littleEndian);
                break;
            default:
                throw "unreachable case: "+currNibble;
                //System.out.println("default");
        }
    }
    return temp;
}
  
/**
 *  Decode the indicated number of samples from the provided byte array and
 *  return an integer array of the decompressed values.  Being differencing
 *  compression, there may be an offset carried over from a previous data
 *  record.  This offset value can be placed in <b>bias</b>, otherwise leave
 *  the value as 0.
 *  @param b input byte array to be decoded
 *  @param numSamples the number of samples that can be decoded from array
 *  <b>b</b>
 *  @param swapBytes if true, swap reverse the endian-ness of the elements of
 *  byte array <b>b</b>.
 *  @param bias the first difference value will be computed from this value.
 *  If set to 0, the method will attempt to use the X(0) constant instead.
 *  @return int array of length <b>numSamples</b>.
 *  @throws SteimException - encoded data length is not multiple of 64
 *  bytes.
 */
steim2.decode = function (dataView, numSamples, swapBytes, bias) {
	if (dataView.byteLength % 64 != 0) {
		throw "encoded data length is not multiple of 64 bytes (" + b.length + ")"; 
	}
	var samples = [];
	var tempSamples;
	var numFrames = dataView.byteLength / 64;
	var current = 0;
	var start=0
	var end=0;
	var firstData=0;
	var lastValue = 0;
      
	//System.err.println("DEBUG: number of samples: " + numSamples + ", number of frames: " + numFrames + ", byte array size: " + b.length);
	for (var i=0; i< numFrames ; i++ ) {
		tempSamples = extractSteim2Samples(dataView, i*64, swapBytes);   // returns only differences except for frame 0
		firstData = 0; // d(0) is byte 0 by default
		if (i==0) {   // special case for first frame
			// console.log("i==0, special case for first frame")
			lastValue = bias; // assign our X(-1)
			// x0 and xn are in 1 and 2 spots
			start = tempSamples[1];  // X(0) is byte 1 for frame 0
			end = tempSamples[2];    // X(n) is byte 2 for frame 0
			firstData = 3; // d(0) is byte 3 for frame 0
			//console.log("DEBUG: frame " + i + ", bias = " + bias + ", x(0) = " + start + ", x(n) = " + end);
			// if bias was zero, then we want the first sample to be X(0) constant
			if (bias == 0) lastValue = start - tempSamples[3];  // X(-1) = X(0) - d(0)
		}
		//System.err.print("DEBUG: ");
		for (var j = firstData; j < tempSamples.length && current < numSamples; j++) {
			samples[current] = lastValue + tempSamples[j];  // X(n) = X(n-1) + d(n)
			lastValue = samples[current];
			//console.log("d(" + (j-firstData) + ")" + tempSamples[j] + ", x(" + current + ")" + samples[current] + ";");
			current++;
		}
		//System.err.println("DEBUG: end of frame " + i);
	}  // end for each frame...
        if (current != numSamples) {
            throw "Number of samples decompressed doesn't match number in header: "+current+" != "+numSamples;
        }
        // ignore last sample check???
        //if (end != samples[numSamples-1]) {
        //    throw new SteimException("Last sample decompressed doesn't match value x(n) value in Steim2 record: "+samples[numSamples-1]+" != "+end);
        //}
	return samples;
}
	

/**
 * Extracts differences from the next 64 byte frame of the given compressed
 * byte array (starting at offset) and returns those differences in an int
 * array.
 * An offset of 0 means that we are at the first frame, so include the header
 * bytes in the returned int array...else, do not include the header bytes
 * in the returned array.
 * @param bytes byte array of compressed data differences
 * @param offset index to begin reading compressed bytes for decoding
 * @param swapBytes reverse the endian-ness of the compressed bytes being read
 * @return integer array of difference (and constant) values
 */
function extractSteim2Samples(dataView, offset, swapBytes) {
	/* get nibbles */
	var nibbles = dataView.getUint32(offset, swapBytes);
	var currNibble = 0;
	var dnib = 0;
	var temp = new Int32Array(106); //max 106 = 7 samples * 15 long words + 1 nibble int
	var tempInt;
	var currNum = 0;
	for (var i=0; i<16; i++) {
		currNibble = (nibbles >> (30 - i*2 ) ) & 0x03;
		switch (currNibble) {
			case 0:
				//System.out.println("0 means header info");
				// only include header info if offset is 0
				if (offset == 0) {
					temp[currNum++] = dataView.getInt32(offset+(i*4), swapBytes)
				}
				break;
			case 1:
				//console.log("1 means 4 one byte differences " +currNum+" "+dataView.getInt8(offset+(i*4))+" "+dataView.getInt8(offset+(i*4)+1)+" "+dataView.getInt8(offset+(i*4)+2)+" "+dataView.getInt8(offset+(i*4)+3));
				temp[currNum++] = dataView.getInt8(offset+(i*4));
				temp[currNum++] = dataView.getInt8(offset+(i*4)+1);
				temp[currNum++] = dataView.getInt8(offset+(i*4)+2);
				temp[currNum++] = dataView.getInt8(offset+(i*4)+3);
				break;
			case 2:
				tempInt = dataView.getUint32(offset+(i*4), swapBytes);
				dnib = (tempInt >> 30) & 0x03;
				switch (dnib) {
					case 1:
						//console.log("2,1 means 1 thirty bit difference");
						temp[currNum++] = (tempInt << 2) >> 2;
						break;
					case 2:
						//console.log("2,2 means 2 fifteen bit differences");
						temp[currNum++] = (tempInt << 2) >> 17;  // d0
						temp[currNum++] = (tempInt << 17) >> 17; // d1
						break;
					case 3:
						//console.log("2,3 means 3 ten bit differences");
						temp[currNum++] = (tempInt << 2) >> 22;  // d0
						temp[currNum++] = (tempInt << 12) >> 22; // d1
						temp[currNum++] = (tempInt << 22) >> 22; // d2
						break;
					default:
						//console.log("default");
				}
				break;
			case 3:
				tempInt = dataView.getUint32(offset+(i*4), swapBytes);
				dnib = (tempInt >> 30) & 0x03;
				// for case 3, we are going to use a for-loop formulation that
				// accomplishes the same thing as case 2, just less verbose.
				var diffCount = 0;  // number of differences
				var bitSize = 0;    // bit size
				var headerSize = 0; // number of header/unused bits at top
				switch (dnib) {
					case 0:
						//System.out.println("3,0 means 5 six bit differences");
						headerSize = 2;
						diffCount = 5;
						bitSize = 6;
						break;
					case 1:
						//System.out.println("3,1 means 6 five bit differences");
						headerSize = 2;
						diffCount = 6;
						bitSize = 5;
						break;
					case 2:
						//System.out.println("3,2 means 7 four bit differences, with 2 unused bits");
						headerSize = 4;
						diffCount = 7;
						bitSize = 4;
						break;
					default:
						//System.out.println("default");
				}
				if (diffCount > 0) {
					for (var d=0; d<diffCount; d++) {  // for-loop formulation
						temp[currNum++] = ( tempInt << (headerSize+(d*bitSize)) ) >> (((diffCount-1)*bitSize) + headerSize);
					}
				}
		}
	}
	var out = new Int32Array(currNum);
	for(var i=0; i<currNum; i++) {
		out[i] = temp[i];
	}
	return out;
}
let seedcodec =  { decompress, steim1, steim2 }
	
