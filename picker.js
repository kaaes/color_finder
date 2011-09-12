var Picker = (function() {
    var c = null, canvas = null, tmp = null, baseShadeImg = null, shades = [];

    function changeColors(evt) {
        var value = evt.target.value;
        putImageOnCanvas(shades[value])
    }

    function createShades() {
        baseShadeImg = c.getImageData(0, 0, canvas.width, canvas.height);
        for (var i = 0; i < 256; i += 1) {
            shades[i] = createShade(i);
        }
    }

    function createShade(b) {
        var shadeImg = c.createImageData(canvas.width, canvas.height);
        var input = baseShadeImg.data;
        var output = shadeImg.data;
        var len = input.length;
        var n = 0;
        for (var i = 0; i < len; i += 1) {
            output[i] = n === 2 ? b : input[i];
            n = n === 3 ? 0 : n + 1;
        }
        return shadeImg;
    }

    function putImageOnCanvas(imageData) {
        c.clearRect(0, 0, canvas.width, canvas.height);
        c.putImageData(imageData, 0, 0);
    }

    function createPicker(b) {
        tmp = document.createElement('canvas');
        tmp.cssText = 'display:none';
        tmp.width = 255;
        tmp.height = 255;
        document.body.appendChild(tmp);
        var tmpC = tmp.getContext('2d');
        tmpC.save();
        for (var i = 0; i < 255; i++) {
            tmpC.save();
            for (var j = 0; j < 255; j++) {
                var color = 'rgb(' + i + ', ' + j + ', ' + b + ')';
                tmpC.fillStyle = color;
                tmpC.fillRect(0, 0, 1, 1);
                tmpC.translate(1, 0);
            }
            tmpC.restore();
            tmpC.translate(0, 1);
        }
        tmpC.restore();
        c.drawImage(tmp, 0, 0, canvas.width, canvas.height);
        document.body.removeChild(tmp);
        tmp = null;
    }

    return {
        init : function(options) {
            var opts = options || {};
            var sliderId = opts.sliderId || 'slider';
            var canvasId = opts.canvasId || 'canvas';
            var cWidth = opts.canvasWidth || 400;
            var cHeight = opts.canvasHeight || 400;
            var initValue = opts.initValue || 0;

            var slider = document.getElementById(sliderId);
            canvas = document.getElementById(canvasId);
            c = canvas.getContext('2d');

            slider.addEventListener('change', changeColors, false);

            canvas.width = cWidth;
            canvas.height = cHeight;

            createPicker(initValue);
            createShades();
        }
    }
})();