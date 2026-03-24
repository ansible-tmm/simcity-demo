#!/usr/bin/env node
/**
 * Node.js script to test base64 decoding of videos360.js
 * Usage: node test-base64-node.js
 */

const fs = require('fs');
const path = require('path');

// Read the videos360.js file
const videos360Path = path.join(__dirname, 'assets', 'videos360.js');
const content = fs.readFileSync(videos360Path, 'utf8');

// Extract the video360Data object using regex
const match = content.match(/var video360Data = ({[\s\S]*});/);
if (!match) {
    console.error('Could not find video360Data in videos360.js');
    process.exit(1);
}

// Evaluate the JavaScript to get the object (be careful with eval!)
let video360Data;
try {
    eval('video360Data = ' + match[1]);
} catch (e) {
    console.error('Error parsing video360Data:', e.message);
    process.exit(1);
}

const keys = Object.keys(video360Data);
console.log(`Found ${keys.length} video(s)\n`);

keys.forEach((key, index) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Video ${index + 1}: ${key}`);
    console.log('='.repeat(80));
    
    const videoInfo = video360Data[key];
    const base64Data = videoInfo.data;
    
    console.log(`MIME Type: ${videoInfo.mime}`);
    console.log(`Base64 Length: ${base64Data.length} characters`);
    console.log(`Expected binary size: ~${Math.floor(base64Data.length * 3 / 4)} bytes`);
    
    // Check for invalid characters
    const invalidChars = base64Data.match(/[^A-Za-z0-9+/=]/g);
    if (invalidChars) {
        console.log(`\n❌ Invalid characters found: ${invalidChars.slice(0, 20).join(', ')}`);
        console.log(`First invalid at position: ${base64Data.search(/[^A-Za-z0-9+/=]/)}`);
    } else {
        console.log(`\n✓ No invalid characters`);
    }
    
    // Check length
    if (base64Data.length % 4 !== 0) {
        console.log(`\n❌ Length is not multiple of 4: ${base64Data.length} (remainder: ${base64Data.length % 4})`);
    } else {
        console.log(`\n✓ Length is multiple of 4`);
    }
    
    // Try decoding
    console.log(`\nAttempting to decode...`);
    try {
        const buffer = Buffer.from(base64Data, 'base64');
        console.log(`✓ Successfully decoded!`);
        console.log(`Binary length: ${buffer.length} bytes`);
        console.log(`First 50 bytes (hex): ${buffer.slice(0, 50).toString('hex')}`);
        
        // Check if it looks like a valid WebM file
        const webmHeader = buffer.slice(0, 4).toString('ascii');
        if (webmHeader === '1a45' || buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
            console.log(`✓ Looks like a valid WebM file (EBML header found)`);
        } else {
            console.log(`⚠ First bytes don't match WebM header (expected EBML)`);
        }
        
    } catch (e) {
        console.log(`\n❌ Decoding failed: ${e.message}`);
        
        // Try to find where it fails by testing chunks
        const chunkSize = 1024 * 1024 * 4; // 4MB chunks
        let currentPos = 0;
        let chunkIndex = 0;
        
        while (currentPos < base64Data.length) {
            let chunkEnd = Math.min(currentPos + chunkSize, base64Data.length);
            if (chunkEnd < base64Data.length) {
                chunkEnd = Math.floor((chunkEnd - currentPos) / 4) * 4 + currentPos;
            }
            
            const chunk = base64Data.substring(currentPos, chunkEnd);
            
            try {
                Buffer.from(chunk, 'base64');
                chunkIndex++;
                if (chunkIndex % 10 === 0) {
                    process.stdout.write(`Processed chunk ${chunkIndex}...\r`);
                }
            } catch (chunkError) {
                console.log(`\n❌ Failed at chunk ${chunkIndex}`);
                console.log(`Position: ${currentPos}-${chunkEnd}`);
                console.log(`Chunk length: ${chunk.length}`);
                console.log(`Chunk length % 4: ${chunk.length % 4}`);
                console.log(`First 200 chars: ${chunk.substring(0, 200)}`);
                console.log(`Last 200 chars: ${chunk.substring(Math.max(0, chunk.length - 200))}`);
                break;
            }
            
            currentPos = chunkEnd;
        }
    }
});

console.log(`\n\nDone!`);
