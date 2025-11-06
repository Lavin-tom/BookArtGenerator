/*      Licence
     ================
     <Book Art Creator Javascript Port: Creates patterns from images for folding book pages to get book sculptures>
     Copyright (C) 2015  Maren Hachmann, <marenhachmann@yahoo.com>
     This program is free software: you can redistribute it and/or modify
     it under the terms of the GNU Affero General Public License as
     published by the Free Software Foundation, either version 3 of the
     License, or (at your option) any later version.

     This program is distributed in the hope that it will be useful,
     but WITHOUT ANY WARRANTY; without even the implied warranty of
     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
     GNU Affero General Public License for more details.

     You should have received a copy of the GNU Affero General Public License
     along with this program.  If not, see <http://www.gnu.org/licenses/>.

    USAGE:
    Enter the values regarding your book.
    Be sure to have a ruler on hand.
    To preview the result, look at the file named *-sheets.png.
    To fold your pattern, follow the instructions in *-pattern.txt.

    KNOWN PROBLEMS:
    - Images with artifacts (like JPG images, or images created by converting from lossy formats)
    can cause small unfoldable lines. The program will issue a warning if the picture contains
    very short lines. It is the responsibility of the user to check if this warning is justified
    or if the short line is intentional.

    If you make a beautiful object of art, please don't hesitate to send me a picture!
*/

var canvas;
var ctx;
var userimage;
var userfilename;
var selected_canvas;
var selected_ctx;
var selected_placeholder;
var input_ids = ['projectname', 'firstpage', 'lastpage', 'cm', 'inch', 'bookheight', 'singleprecision', 'smoothe'];
var entries = {projectname: '', firstpage: '0', lastpage: '', cm: '', inch: '', bookheight: '', singleprecision: '', smoothe: ''};

window.onload = function () {
    var filebutton = document.getElementById('userimage');
    filebutton.addEventListener('change', loadImage, false);

    for (var i = 0; i < input_ids.length; i++) {
        document.getElementById(input_ids[i]).addEventListener('change', processEntries, false);
    }

    // initialize slider value display correctly (browser autocompletion after page reload)
    var smoothe = document.getElementById('smoothe');
    var out = document.getElementById('smootheoutput');
    out.innerHTML = smoothe.value;
    smoothe.addEventListener('input', showValue, false);

    var startbutton = document.getElementById('startbutton');
    startbutton.addEventListener('click', processEntries, false);

    var imagedlbutton = document.getElementById('imagedlbutton');
    imagedlbutton.addEventListener('click', downloadImage, false);

    var textdlbutton = document.getElementById('textdlbutton');
    textdlbutton.addEventListener('click', downloadText, false);

    canvas = document.getElementById('patternimage');
    ctx = canvas.getContext('2d');

    selected_canvas = document.getElementById('selected_image');
    selected_ctx = selected_canvas.getContext('2d');

    selected_placeholder = new Image();
    selected_placeholder.addEventListener('load', display_selected_image, false);
    selected_placeholder.src = selected_canvas.getAttribute('fallback');

    deactivate_startbutton();
}

function showValue(event) {
    var out = document.getElementById('smootheoutput');
    out.innerHTML = event.target.value;
}

function loadImage(event) {
    event.preventDefault();

    // remove old error messages and styling
    document.getElementById('userimage').parentElement.classList.remove("error");
    empty_error('img_errorbox');

    // remove old preview and messages
    hide('result');
    empty_error('errorbox');

    var input, file, fr, userimg;
    var errortext = "";

    if (typeof window.FileReader !== 'function') {
        errortext += "The file API isn't supported on this browser yet.";
    }
    input = document.getElementById('userimage');
    if (!input.files) {
        errortext += "This browser doesn't seem to support the `files` property of file inputs.";
    }
    else if (!input.files[0]) {
        errortext += "Please select a file before clicking on 'Load image'.";
    }
    else if (input.files[0].type.slice(0, 5) != "image") {
        errortext += "The file you uploaded is not an image file. Please use a valid file format, e.g. jpg, png, ...";
    }
    else if (input.files[0].type.search("svg") != -1){
        errortext +="Sorry, I can't handle svg resizing yet. Please convert your image file into a pixel based format.";
    }

    if (errortext != ""){
        deactivate_startbutton();
        print_error(errortext, 'img_errorbox');
    }
    else {
        file = input.files[0];
        //make file's name globally accessible
        userfilename = input.files[0].name;
        fr = new FileReader();
        fr.onload = createImage;
        fr.readAsDataURL(file);
    }

    function createImage() {
        userimg = new Image();
        userimg.onload = imageLoaded;
        userimg.src = fr.result;
    }

    function imageLoaded() {
        userimage = userimg;
        display_selected_image(null, userimage)
        processEntries(false);
    }
}

// hacky. Works with and without event...
function display_selected_image(event, img) {
        img = img || selected_placeholder;
        selected_ctx.clearRect(0,0, selected_canvas.width, selected_canvas.height);

        // resize preview image, like 'background-size: contain', canvas is square, ratio is 1
        if (img.width/img.height < 1) {
            var new_width = img.width * selected_canvas.width/img.height;
            var new_height = selected_canvas.height;
        }
        else {
            var new_width = selected_canvas.width;
            var new_height = img.height * selected_canvas.width/img.width;
        }

        var new_x = (selected_canvas.width - new_width)/2;
        var new_y = (selected_canvas.height - new_height)/2;

        selected_ctx.drawImage(img, new_x,new_y, new_width, new_height);
}

function checkEntry(element) {
    var err_msg;

    // remove outdated pattern files
    hide('result');

    // remove old error messages/styling (removing a class that isn't there gives no error)
    element.parentElement.classList.remove("error");
    remove_error(element.id + '_errorbox');

    switch (element.id) {
        case 'projectname':
            // process projectname
            if (element.value) {
                entries.projectname = element.value;
            }
            else if (element.placeholder) {
                entries.projectname = element.placeholder;
            }
            else {
                entries.projectname = "My Book Art Project";
            }
            if (entries.projectname.length > 100) {
                entries.projectname = entries.projectname.slice(0,100);
            }
            break;

        case 'firstpage':
            // validate firstpage
            if (!element.value || element.validity.valid == false) {
                err_msg = "The first page must be an even, positive number. ";
            }
            else {
                entries.firstpage = parseInt(element.value);
            }
            break;

        case 'lastpage':
            // validate lastpage
            if (!element.value || element.validity.valid == false ||
                    parseInt(element.value) <= entries.firstpage){
                err_msg = "The last page must be an even, positive number. It must be larger than the number of the first page. (This will work with up to 2000 pages. If you are working on a larger book, please contact the author of this website.) ";
            }
            else {
                entries.lastpage = parseInt(element.value);
            }
            break;

        case 'cm':
        case 'inch':
            if (element.checked){entries.unit = element.id}
            break;

        case 'bookheight':
            // validate bookheight and turn to 10ths of mm/100ths of inch
            if (!element.value || element.validity.valid == false){
                err_msg = "The book's height must be a positive number with no more than 1 digit after the decimal point. (This will work for heights between 1 and 40 cm/inch. If you are working on a larger book, please contact the author of this website.) ";

            }
            else {
                entries.bookheight = parseFloat(element.value) * 100;
            }
            break;

        case 'singleprecision':
            // process single precision checkbox
            if (element.checked){entries.singleprecision=true;}
            else {entries.singleprecision=false;}
            break;

        case 'smoothe':
            // validate smoothing value (0-20)
            if (!element.value || element.validity.valid == false){
                err_msg = "The smoothing value you selected is invalid - please use a number between 0 and 20. " ;
            }
            else {
                entries.smoothe = smoothe.value;
            }
            break;
    }

    if (err_msg) {
        element.parentElement.classList.add("error");

        var error_p = document.createElement("p");
        error_p.id = element.id + '_errorbox';
        error_p.classList.add("errormsg");
        var error_text = document.createTextNode(err_msg);
        error_p.appendChild(error_text);
        element.parentElement.appendChild(error_p);
        return false;
    }
    return true;
}

function processEntries(event) {
        if (event){
            event.preventDefault();
        }
        deactivate_startbutton();

        var entries_valid = true;

        // check all entries (won't cause problems for additional values that have been added on the way)
        for (var i = 0; i < input_ids.length; i++) {
            if (checkEntry(document.getElementById(input_ids[i])) == false) {
                entries_valid = false;
            }
        }

        // check if image has been loaded
        entries.userimage = userimage;
        if (!entries.userimage){
            entries_valid = false;
        }

        if (entries_valid == true) {
            if (event && event.target.id == 'startbutton') {
                processImage();
            }
            activate_startbutton();
        }
}

function processImage() {
    entries.numsheets = (entries['lastpage'] - entries['firstpage']) / 2;
    var patterndata = create_patterndata(entries);
    if (patterndata) {
        createpatterntext(patterndata, entries);
        drawPreview(patterndata, entries.bookheight);
        show('result');
    }
}

function create_patterndata(){
    // Calls other functions to make pattern, check pattern, and create preview and pattern text file
    canvas.width = entries.numsheets;
    canvas.height = entries.bookheight;
    ctx.drawImage(entries.userimage, 0, 0, entries.numsheets, entries.bookheight); // TODO: doesn't adapt SVG size :(
    var currentimage = image_to_bw();
    var bandslist = createrawpattern(currentimage);

    if (checkrawpattern(bandslist)) {
        // smoothe the pattern according to smoothing value
        var smoothedpattern = smootherawpattern(bandslist, entries.smoothe);
        var alternating_bandslist = createalternatingpattern(smoothedpattern);
        return alternating_bandslist;
    }
}

function image_to_bw(){
    // Get the CanvasPixelArray from the given coordinates and dimensions.
    var currentimage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var pix = currentimage.data;

    var red, green, blue, brightness, threshold;

    // Loop over each pixel and turn to black or white.
    for (var i = 0, n = pix.length; i < n; i += 4) {
        red = pix[i];
        green = pix[i+1];
        blue = pix [i+2];
        alpha = pix [i+3];

        if (alpha != 0){
            if (alpha != 255){
                // replace background with white, according to opacity
                var alphafactor = alpha/255;
                var whitefraction = (1-alphafactor) * 255;
                red = alphafactor * red + whitefraction;
                green = alphafactor * green + whitefraction;
                blue = alphafactor * blue + whitefraction;
            }
            brightness = (red*299 + green*587 + blue*114)/1000; // see http://www.w3.org/TR/AERT#color-contrast
        }
        else {
            // this pixel is fully transparent, thus 'white'
            brightness = 255
        }

        threshold = 128;

        if (brightness >= threshold){
            pix[i] = 255;
            pix[i+1] = 255;
            pix[i+2] = 255;
        }
        else {
            pix[i] = 0;
            pix[i+1] = 0;
            pix[i+2] = 0;
        }
        pix[i+3] = 255;
    }
    return currentimage
}

function createrawpattern(currentimage){

    function iswhite(pixel){
        if (pixel === 255){
            return true;
        }
        return false;
    }

    function isblack(pixel){
        if (pixel === 0){
            return true;
        }
        return false;
    }

    var imagewidth = currentimage.width;
    var imageheight = currentimage.height;

    //create a workable representation of the imagedata
    var imagerepr = new Object();

    for (var x=0, n=imagewidth; x<n; x+=1){ //for each column
        imagerepr[x] = [];
        for (var y=0, m=imageheight; y < m; y+=1) { //for each pixel in a column (pixels consist of four values)
            imagerepr[x][y] = currentimage.data[(x + y * imagewidth) * 4];
        }
    }

    //create a list of bands of black for each column
    var bandslist = new Object();
    var x, y, colorabove, currentcolor, start, end;

    //for each column
    for (x=0, n=imagewidth; x<n; x+=1){
        y = 0;
        colorabove = null;
        bandslist[x] = new Array();
        //run through all pixels in a column
        while (y < imageheight) {
            currentcolor = imagerepr[x][y];
            while (isblack(currentcolor) && y < imageheight) {
                //if a dark region begins, or if the column is dark at the top, set a start marker
                if (iswhite(colorabove) || colorabove === null) {
                    start = y;
                }
                //if we reached the end of the column, set an end marker
                if (y == imageheight-1) {
                    end = y+1; //add 1 to comprise full dark area
                    bandslist[x].push([start, end]);
                }

                // increment and prepare for next iteration
                y += 1;
                colorabove = currentcolor;
                if (y < imageheight) {
                    currentcolor = imagerepr[x][y];
                }
            }

            while (iswhite(currentcolor) && y < imageheight) {
                // at the border from black to white, set an end marker
                if (isblack(colorabove)) {
                    end = y-1 //subtract 1 to comprise full dark area
                    bandslist[x].push([start, end]);
                }
                // increment and prepare for next iteration
                y += 1;
                colorabove = currentcolor;
                if (y < imageheight) {
                    currentcolor = imagerepr[x][y];
                }
            }
        }
    }
    return bandslist;
}

function checkrawpattern(bandslist){
//Checks the raw pattern dictionary for vertical gaps
    var errormsg = "";
    var x = 0;
    var foundcolumns = false;
    var foundinterruption = false;
    var warningissued = false;
    var bandslistlength = getlength(bandslist);
    // there is no value in the pattern dictionary if the line is all white. White areas at both sides are allowed.
    while (x < bandslistlength) {
        // check for too many bands per column
        if (bandslist[x].length > 5) {
            foundcolumns = true;
            errormsg = "Your picture has an awful lot of detail! This results in more than 5 alternating folds in some area(s). Please reduce the details in your picture and call this program again.";
            break;
        }

        // whitespace in front
        if (!foundcolumns && bandslist[x].length == 0) {
            x += 1;
            continue;
        }
        // first black column
        if (!foundcolumns && bandslist[x].length != 0) {
            foundcolumns = true;
            x += 1;
            continue;
        }
        // following black columns
        if (foundcolumns && bandslist[x].length != 0 && !foundinterruption){
            x += 1;
            continue;
        }
        // first white interruption - end of image or real gap
        if (foundcolumns && bandslist[x].length == 0 && !foundinterruption){
            foundinterruption = true;
            x +=1;
            continue;
        }
        // following whitespace
        if (foundcolumns && bandslist[x].length == 0 && foundinterruption){
            x += 1;
            continue;
        }
        // black after an interruption: oh-oh!
        if (foundcolumns && bandslist[x].length != 0 && foundinterruption){
            errormsg = "Sorry, but your picture has vertical gaps (like space between letters, for example: <a href=\"/posts/2018/May/prepare_bookart_text.html\">learn how to get rid of it here</a>) in it, this won't look good!\nPlease use a different picture!";
            break;
        }
    }
    if (foundcolumns == false) {
        errormsg += "Ooops - you gave me a picture which is only white (or has too little contrast)!"
    }

    if (errormsg) {
        print_error(errormsg, 'errorbox');
        return false;
    }
    return true;
}

function smootherawpattern(bandslist, smoothing_value) {
      var smoothed = new Object;
      var merged, start, end, nextstart, warningmsg, band;
      var new_list = [];
      var bandslistlength = getlength(bandslist);

      for (x=0, n=bandslistlength; x<n; x+=1){
          // reset for new column
          new_list = [];
          merged = false;
          // only try smoothing if there is more than one band
          if (bandslist[x].length > 1){
              for (band=0; band<(bandslist[x].length-1); band+=1) {;
                  // set a new start point only if the areas have not been connected
                  if (!merged) {
                      start = bandslist[x][band][0];
                  }
                  end = bandslist[x][band][1];
                  nextstart = bandslist[x][band+1][0];
                  // check if start of next band and end of current band are very close
                  if (nextstart - end < smoothing_value) {
                      // if so, make them one single band
                      end = bandslist[x][band+1][1];
                      merged = true;
                      if (smoothing_value > 0) {
                          warningmsg = "Smoothed one or more folds, because the distance between one dark area and the dark area below it was shorter than the selected smoothing value. Please check the pattern thoroughly for correctness. If it looks wrong, try to use a better picture, or try to enter different values for page numbers. If the tiny gaps are intentional, then don't use smoothing.)";
                      }
                  }
                  // else add the band to the list
                  else {
                      new_list.push([start, end]);
                      merged = false;
                  }
                  // if we're at the next-to-last band, and just pushed this to the array,
                  // don't forget to handle the last band
                  if (band == (bandslist[x].length-2)) {
                      if (merged == false) {
                          new_list.push([bandslist[x][band+1][0], bandslist[x][band+1][1]]);
                      }
                      else {
                          new_list.push([start, end]);
                      }
                  }
              }
          }
          else {
              // just copy
              new_list = bandslist[x].slice();
          }
          smoothed[x] = new_list.slice();
      }
      // just a warning, program can continue
      if (warningmsg) {
          print_error(warningmsg, 'errorbox');
      }
      return smoothed;
}

function createalternatingpattern(bandslist){
    //Creates the folding pattern which allows for alternate folding if there are several bands of dark in a line
    var altpattern = new Array;
    var bandslistlength = getlength(bandslist);
    var column;
    for (x=0, n=bandslistlength; x<n; x+=1){
        column = bandslist[x];
        num_bands = column.length;
        if (num_bands == 0) {
            altpattern[x] = [];
        }
        else if (num_bands == 1) {
            altpattern[x] = column[0].slice();
        }
        else {
            altpattern[x] = column[x % num_bands].slice();
        }
    }
    return altpattern;
}

function createpatterntext(patterndata){
    var text;
    textarea = document.getElementById('patterntext');

    text =  "Book Folding Art Pattern for \"" + entries.projectname + "\"\n" +
            "==============================================================================\n\n" +
            "Instructions:\n" +
            "These measurements describe where you will have to fold the pages of your book.\n" +
            "All measurements are given in cm/inch, whichever you chose at the beginning.\n" +
            "The first number indicates the page number, the second tells you where\n" +
            "(measured from the top of the book) you have to fold the upper corner down,\n" +
            "the third tells you where you will have to fold the lower corner up.\n\n"+
            " Page     Top Fold     Bottom Fold\n" +
            "==========================================\n\n";

    for (x=0, n=entries.numsheets; x<n; x++) {
        page = x*2 + entries.firstpage;
        page_formatted = ("      " + page.toString()).slice(-4);

        if (patterndata[x][0] == 0 && patterndata[x][1] == entries.bookheight){
            text += page_formatted + "              No folds.\n";
        }
        // checking for x[1], because x[0] can be zero, which corresponds to false, but isn't meant here
        else if (patterndata[x].length == 0) {
            text += page_formatted + "        Fold back completely.\n";
        }
        else {
            uppercorner = patterndata[x][0]/100;
            lowercorner = patterndata[x][1]/100;

            if (entries.singleprecision == true) {
              uppercorner = uppercorner.toFixed(1);
              lowercorner = lowercorner.toFixed(1);
            }
            else {
              uppercorner = uppercorner.toFixed(2);
              lowercorner = lowercorner.toFixed(2);
            }

            uppercorner = ("      " + uppercorner).slice(-7);
            lowercorner = ("      " + lowercorner).slice(-7);

            text += page_formatted + "     " + uppercorner + "        " + lowercorner + "\n";
        }

        if (page % 10 == 0) {
            text += "------------------------------------------\n";
        }
    }

    text += "\n\n\nThis Book Art pattern was created using the free BookArtGenerator service at:\n";
    text += "https://vektorrascheln.de/bookart\n\n";
    text += "As the author of the open source service, I would be very happy to see your cool creations!\n";
    text += "Please send me a mail with a photo (licensed under CC-By-SA 4.0, allowing to show the\n";
    text += "photo on the website, to modify it if necessary, always quoting you as the originator,\n";
    text += "allowing commercial use) to " + "m" + "oini" + "@" + "goos-" + "habermann" + ".de.\n\n";
    text += "------------  HAVE FUN FOLDING :-)  ------------ !\n\n";

    textarea.value = text;
}

function drawPreview(patterndata, height) {
    // add additional space for first page number
    var half_number_width = 18
    canvas.width = patterndata.length * 6 + 2*half_number_width;
    canvas.height = height + 50;

    // clear background
    ctx.fillStyle = "white";
    ctx.fillRect(0,0,canvas.width, canvas.height);

    // set line width and font style
    ctx.lineWidth = 2;
    ctx.fillStyle = "black";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";

    // draw all book pages
    for (var x=0; x<patterndata.length; x++) {
        if ((x + entries.firstpage/2) % 10 == 0) {
            ctx.strokeStyle = 'Thistle';
        } else {
            ctx.strokeStyle = 'gainsboro';
        }

        ctx.beginPath();
        ctx.moveTo(x*6 + half_number_width, 0);
        ctx.lineTo(x*6 + half_number_width, height);
        ctx.stroke();
    }

    // draw pattern
    for (var x=0; x<patterndata.length; x++) {
        if ((x + entries.firstpage/2) % 10 == 0) {
            ctx.strokeStyle = 'PaleVioletRed';
        } else {
            ctx.strokeStyle = 'dimgray';
        }
        ctx.beginPath();
        ctx.moveTo(x*6 + half_number_width, patterndata[x][0] );
        ctx.lineTo(x*6 + half_number_width, patterndata[x][1]);
        ctx.stroke();
    }

    // draw page numbers
    for (var x=0; x<patterndata.length; x++) {
        var pagenum = x*2 + entries.firstpage;
        if (pagenum % 20 == 0) {
            ctx.fillText(pagenum, x*6 + half_number_width, canvas.height - 30);
        }
    }
    ctx.fillText("Print this picture with a height of " + canvas.height/100 + " " + entries.unit + ".", canvas.width/2, canvas.height-5);
}

//HELPER FUNCTIONS

function downloadImage(){
    var dataurl = canvas.toDataURL('image/png');
    if (window.navigator.userAgent.indexOf("Edge") > -1 || window.navigator.userAgent.indexOf("Trident") > -1 ) {
		    var html = "<img src='" + dataurl + "' alt='canvas image' title='Right-click on image to download!'/>";
        var newTab=window.open();
        newTab.document.write(html);
	} else {
		this.download = userfilename.substr(0, userfilename.lastIndexOf('.')) + "_preview.png";
		this.href = dataurl;
	}
}

function downloadText(){
    text = document.getElementById('patterntext').value;
    if (window.navigator.userAgent.indexOf("Edge") > -1 || window.navigator.userAgent.indexOf("Trident") > -1 ) {
		    var html = "<pre>"+ text + "</pre>";
        var newTab = window.open();
        newTab.document.write(html);
    } else {
    this.download = userfilename.substr(0, userfilename.lastIndexOf('.')) + "_pattern.txt";
    this.href = ('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    }
}

function print_error(err_msg, err_box_id){
    var messagebox = document.getElementById(err_box_id);
    messagebox.innerHTML=(err_msg);//appendChild(document.createTextNode(err_msg));
    messagebox.style.display = 'block';
}

function empty_error(err_box_id){
    var messagebox = document.getElementById(err_box_id);
    messagebox.innerHTML = "";
    messagebox.style.display = 'none';
}

function remove_error(err_box_id) {
    var messagebox = document.getElementById(err_box_id);
    if (messagebox) {
        messagebox.parentElement.removeChild(messagebox);
    }
}

function deactivate_startbutton(){
    document.getElementById('startbutton').addEventListener('click', show_hint, 'false');
    document.getElementById('startbutton').classList.add("disabled");
}

function activate_startbutton(){
    var startbutton = document.getElementById('startbutton');
    startbutton.removeEventListener('click', show_hint, 'false');
    startbutton.classList.remove("disabled");
}

function show_hint(event){
    event.preventDefault();
    var tooltip_text = "Fill in all the fields, and fix all errors to activate the button. If all is filled in, and there are no errors, and you still cannot click on the button, try using a different browser, or switch to a desktop computer. Firefox, Edge and Chrome on desktop are known to work."

    alert(tooltip_text);
}

function getlength(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function show(id) {
    toshow = document.getElementById(id);
    toshow.style.display = 'block';
}

function hide(id) {
    tohide = document.getElementById(id);
    tohide.style.display = 'none';
}

// TODO: SVG resizing.
// Hints:
//    width="100"
//    height="1000"
//    viewBox="0 0 881 1265"
//    preserveAspectRatio="none"

// var parser = new DOMParser();
// var doc = parser.parseFromString(stringContainingXMLSource, "image/svg+xml");
