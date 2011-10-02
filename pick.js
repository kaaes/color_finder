var Picker = (function() {    
  var _mode, _selectedColor = [], _colorToCopy = ''; _lastPosition = [];
  var _cWidth, _cHeight;
  var _isMac = false;
     
  var _colorCont = null, _colorInput = null;
    
  var modeKeys = {
    hsl : { char : 'h', charCode : 104, keyCode : 72 },
    rgb : { char : 'r', charCode : 114, keyCode : 82 },
    hex : { char : 'x', charCode : 120, keyCode : 88 }
  };
    
  function byId(id) {
    return document.getElementById(id);
  }
    
  function findMode(key, value) {
    for(var mode in modeKeys) {
      if(modeKeys.hasOwnProperty(mode) && modeKeys[mode][key] === value) {
        return mode;
      }
    }
  }
    
  function createCanvas(containerId, canvasId, options) {
    var opts = options || {};
    var height = opts.height || _cHeight;
    var width = opts.width || _cWidth;
    var cssText = opts.cssText || '';
    var attrs = opts.attrs; 

    var canvasContainer = byId(containerId);
    var canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.width = width;
    canvas.height = height;
    canvas.style.cssText = cssText;
    for(var a in attrs) {
      canvas[a] = attrs[a];
    }
    canvasContainer.appendChild(canvas); 
    return canvas;
  }
    
    var dynamic = {      
      renderColorAll : function(colorObj) {
        var colorRGB = colorObj.rgb || _selectedColor;
        var colorHUE = colorObj.hue;
        
        var hsl = convertFromRGB.hsl.apply(this, colorRGB);
        var hue = colorHUE || hsl[0];
        
        picker.renderColor(hue);
        text.renderColor(colorRGB);
        slider.renderColor(hue);
      }      
    }
    
    var picker = (function(){
      var _width, _height, _tolerance;
      var _pointer, _color, _mask, _colorC;
      var _currentMark = [0,0];
      
      var dynamic = {
        changeColor : function(evt) {
          renderColor(evt.layerX, evt.layerY);
        },
        
        readColor : function(x, y) {    
          var imgData = _colorC.getImageData(0, 0, _width, _height);  
          var pixels = imgData.data;
          var index = (y * _width + x)*4;
          
          _selectedColor = [pixels[index], pixels[index+1], pixels[index+2]];
          _lastPosition = [x, y];      
          return _selectedColor;
        },
        
        getColorCoordinates: function(x, y) {
          var pX = x < _tolerance ? 0 : x >= _width + _tolerance ? _width-1 : x - _tolerance;
          var pY = y < _tolerance ? 0 : y >= _height + _tolerance ? _height-1 : y - _tolerance;
          return [pX, pY];
        },

        getPickerCoordinates: function(x, y) {
          var pX = x < _tolerance ? _tolerance : x >= _width + _tolerance ? _width-1+_tolerance : x;
          var pY = y < _tolerance ? _tolerance : y >= _height + _tolerance ? _height-1+_tolerance : y;
          return [pX, pY];
        },
        
        drawMarker : function(x, y) {
          if(typeof x !== 'number' || typeof y !== 'number') return;
          var pContext = _pointer.getContext('2d');
          pContext.clearRect(0,0,_pointer.width, _pointer.height);
          pContext.beginPath();
          pContext.arc(x, y, 5, 0, Math.PI*2);
          pContext.stroke();
          pContext.closePath();
        }
      }
      function renderColor(x, y) {
        x = Math.ceil(x), y = Math.ceil(y);
        var xy = dynamic.getColorCoordinates(x, y);
        dynamic.readColor(xy[0], xy[1]);
        text.renderColor();
        var pxy = dynamic.getPickerCoordinates(x, y);
        _currentMark = [pxy[0], pxy[1]];
        dynamic.drawMarker(pxy[0], pxy[1]);
      }
      
      function keyboardNavigation(evt){
        var unit = _color.width/360;
        var speed = unit;
        if(evt.keyCode >= 37 && evt.keyCode <= 40) {
          evt.preventDefault(); 
          if(evt.shiftKey) {
            speed *= 5;
          }
          if(evt.keyCode === 37) {
            _currentMark[0] -= speed;
            _currentMark[0] = _currentMark[0] > 1 ? _currentMark[0] : 1;
          }
          if(evt.keyCode === 39) {
            _currentMark[0] += speed;
            _currentMark[0] = _currentMark[0] < _pointer.width ? _currentMark[0] : _pointer.width;
          }
          if(evt.keyCode === 38) {
            _currentMark[1] -= speed;
            _currentMark[1] = _currentMark[1] > 1 ? _currentMark[1] : 1;
          }
          if(evt.keyCode === 40) {
            _currentMark[1] += speed;
            _currentMark[1] = _currentMark[1] < _pointer.height ? _currentMark[1] : _pointer.height;
          }
          renderColor(_currentMark[0], _currentMark[1]);
        }
      }
      
      function applyAlpha(axis, baseImg, context, width, border) {    
        var side = 2*border + width;  
        var alphaImg = context.createImageData(side, side);

        var input = baseImg.data;
        var output = alphaImg.data;
        var len = input.length;

        for(var y = 0; y < side; y++) {
          for(var x = 0; x < side; x++) {
            for(var i = 0; i < 4; i++) {
              var n = (y*side + x)*4 + i;
              var val;
              if(axis === 'x') {
                val = x > border ? side-border-x : 255; 
              } else {
                val = y > border ? y-border : 0
              }
              output[n] = i === 3 ? val : input[n];
            }
          }
        }      
        context.putImageData(alphaImg, 0, 0);
      }

      function createMask(containerId) {
          var border = 5;
          var width = 255;
          var side = 2*border + width;

          var mask = createCanvas(containerId, 'canvas-m', {cssText: 'position:absolute;top:0px;left:0px;z-index:1'});

          var c = mask.getContext('2d');
          var mW = mask.width;
          var mH = mask.height;

          var tmp = createTmpMask(containerId, width, border);
          var tmpC = tmp.getContext('2d');

          var tmpImgData = tmpC.getImageData(0, 0, tmp.width, tmp.height);

          applyAlpha('x', tmpImgData, tmpC, width, border);
          c.drawImage(tmp, 0, 0, mW, mH);
          applyAlpha('y', tmpImgData, tmpC, width, border);
          c.drawImage(tmp, 0, 0, mW, mH);      

          byId(containerId).removeChild(tmp);
          tmp = null;
          return mask;
      }

      function createTmpMask(containerId, width, border) {
        var side = 2*border + width;
        var tmp = createCanvas(containerId, 'canvas-tmp', {
          width: side,
          height: side,
          cssText : 'display:none'
        });
        var tmpC = tmp.getContext('2d');
        tmp.style.cssText = 'display:none';

        tmpC.save();
        tmpC.fillStyle = 'white';
        tmpC.fillRect(0, 0, side, border);
        tmpC.translate(0, border);

        for (var i = 0; i < width; i++) {
            tmpC.save();
            for (var j = 0; j < side; j++) {
                var grey =  width - i;
                var color = 'rgb(' + grey + ', ' + grey + ', ' + grey + ')';
                tmpC.fillStyle = color;
                tmpC.fillRect(0, 0, 1, 1);
                tmpC.translate(1, 0);
            }
            tmpC.restore();
            tmpC.translate(0, 1);
        }

        tmpC.fillStyle = 'black';
        tmpC.fillRect(0, 0, side, border);
        tmpC.restore();
        return tmp;
      }
      
      return {
        create : function(containerId, width, height, tolerance){
          _width = width;
          _height = height;
          _tolerance = tolerance;
          _currentMark = [tolerance, tolerance];
          
          _color = createCanvas(containerId, 'canvas-c', {cssText:'background:transparent;display:block;position:relative;top:0;left:0;z-index:2'});            
          _mask = createMask(containerId);
          _pointer = createCanvas(containerId, 'canvas-p',{
            width : _width + 2*_tolerance,
            height : _height + _tolerance,
            cssText : 'background:transparent;position:absolute;top:-'+_tolerance+'px;left:-'+_tolerance+'px;z-index:3',
            attrs : {tabIndex : 0}
          });
          
          _colorC = _color.getContext('2d');
        },
        bindEvents : function() {
          var prevX = 0, prevY = 0, dist = 5;

          function changeColor(evt) {
            if(Math.abs(evt.clientX - prevX) > dist || Math.abs(evt.clientY - prevY) > dist) {
              dynamic.changeColor(evt);
              prevX = evt.clientX;
              prevY = evt.clientY;
            }
          }

          _pointer.addEventListener('click', dynamic.changeColor, false);
          
          _pointer.addEventListener('mousedown', function(evt) {
            dynamic.changeColor(evt)
            this.addEventListener('mousemove', changeColor, false);
            this.addEventListener('mouseup', function() {
              this.removeEventListener('mousemove', changeColor, false);
            }, false);
          }, false);
          
           _pointer.addEventListener('keydown', keyboardNavigation, false);
        },
        renderColor :  function (hue) {
          _colorC.clearRect(0, 0, _width, _height);
          _colorC.fillStyle = 'hsl('+hue+', 100%, 50%)';
          _colorC.fillRect(0, 0, _width, _height);
          _colorC.drawImage(_mask, 0, 0, _width, _height);
          if(_lastPosition[0] && _lastPosition[1]) {
            dynamic.readColor(_lastPosition[0],_lastPosition[1])
          }
        }
      }
    })();
    
    var slider = (function() { 
      var _container, _s, _c, _width, _tmp, _currentMark = 0, _unit = 1;
      
      function markPoint(point) {
        //console.log(point);
        _currentMark = point;
        _c.clearRect(0,0, _s.width, _s.height);
        _c.drawImage(_tmp, 0, 0, _s.width, _s.height) 
        _c.fillStyle = 'black';
        _c.beginPath();
        _c.moveTo(point-4, 0);
        _c.lineTo(point+4, _s.height);
        _c.lineTo(point-4, _s.height);
        _c.lineTo(point+4, 0);
        _c.closePath();
        _c.fill();
      }
      
      function setHue(evt) {
        var x = evt.layerX;
        renderColor(x)
      }
      
      function renderColor(point) {
        var h = point * _unit;      
        //console.log(h +" "+point);  
        markPoint(point);
        picker.renderColor(h);
        text.renderColor();
      }
      
      function keyboardNavigation(evt){
        var speed = _unit
        if(evt.keyCode === 37 || evt.keyCode === 39) { 
          evt.preventDefault();
          if(evt.shiftKey) {
            speed *= 5;
          }
          if(evt.keyCode === 37) {
            _currentMark -= speed;
            _currentMark = _currentMark > 0 ? _currentMark : 0;
          }
          if(evt.keyCode === 39) {
            _currentMark += speed;
            _currentMark = _currentMark < _width ? _currentMark : _width;
          }
          renderColor(_currentMark)
        }
      }
      
      return {
        create : function(sliderId, width, initHue) {
          _container = byId(sliderId);
          _container.style.width = _cWidth + 'px';
          _width = width;
          
          _tmp = createCanvas(sliderId, 'slider-t', {
            width: 360,
            height: 1,
            cssText : 'position:absolute;top:0;left:-999em'
          });
       
          var tmpC = _tmp.getContext('2d');
          for(var i = 0; i < _tmp.width; i++) {
            tmpC.fillStyle = 'hsl('+i+',80%,50%)';
            tmpC.fillRect(0, 0, 1, _tmp.height);
            tmpC.translate(1, 0);
          } 
          
          _s = createCanvas(sliderId, 'slider-c', {
            width: _width,
            height: 10,
            cssText : 'position:relative;z-index:3',
            attrs : {tabIndex : 0}
          }); 
          _unit = 360/_s.width;
          _c = _s.getContext('2d');
        },
        
        bindEvents : function() {
          _container.addEventListener('mousedown', function(evt) {
            setHue(evt);
            this.addEventListener('mousemove', setHue, false);
            this.addEventListener('mouseup', function(evt) {
              this.removeEventListener('mousemove', setHue, false);
            }, false)
          }, false)
          _s.addEventListener('keydown', keyboardNavigation, false);
        },
        
        renderColor : function(hue) {
          var point = hue * 360/_s.width;
          markPoint(point, hue);
        }
      }         
    })();
    
    var text = (function(){
      var _colorContainer, _colorInput;
      
      function changeMode(evt) { 
        console.log(evt.keyCode);
        var newMode = findMode('keyCode', evt.keyCode)
        if(evt.keyCode === 17 || evt.keyCode === 224) {
          _colorInput.value = _colorToCopy;
          _colorInput.focus();
          _colorInput.select();
        } 
        if(newMode) {
          _mode = newMode;
          text.renderColor();
        }
      }
      
      // cmd224 ctrl17
      
      function createInput() {
        var colorInput = document.createElement('input');
        colorInput.id = 'color-input';
        colorInput.type = 'text';
        document.body.appendChild(colorInput);
        return colorInput
      }
      
      return {
        create : function(containerId, colorContainerId) {
          _colorContainer = byId(colorContainerId);
          _colorInput = createInput();
          var container = byId(containerId);
          for(var mode in modeKeys) {
            if(modeKeys.hasOwnProperty(mode)) {
              var p = document.createElement('p');
              p.className = 'color-key';
              p.id = 'color-key-' + mode;
              p.innerHTML = modeKeys[mode].char + ' + ' + (_isMac ? 'cmd' : 'ctrl') + ' + c : ';
              container.appendChild(p);
              var s = document.createElement('span');
              s.id = 'color-' + mode;
              p.appendChild(s);
            }
          }
        },
        bindEvents : function() {
          document.body.addEventListener('keydown', changeMode, false);
        },
        renderColor : function(color) {
          var colorArr = color || _selectedColor;
          for(var col in convertFromRGB) {
            if(convertFromRGB.hasOwnProperty(col)) {
              var p = byId('color-' + col);
              p.innerHTML = covertFromRGBtoString[col].apply(this, colorArr);
              p.className = ''
            }
          }
          _colorToCopy = covertFromRGBtoString[_mode].apply(this, colorArr);
          _colorContainer.style.background = _colorToCopy;      
          _colorInput.value = _colorToCopy;
          //_colorInput.focus();
          //_colorInput.select();

          var active = byId('color-' + _mode);
          active.className = 'active';
        }
      }
    })();    
    
    var convertFromRGB = {
      rgb : function(r, g, b){ return [r,g,b] },
      hex : function(r, g, b){ return [decTo2digitHex(r), decTo2digitHex(g), decTo2digitHex(b)] },
      hsl : function(r, g, b){
        var H, S, L;
        
        var rD = r / 255;
        var gD = g / 255;
        var bD = b / 255;
        
        var cMin = Math.min(rD, gD, bD);
        var cMax = Math.max(rD, gD, bD);
        
        var L = (cMax + cMin)/2;
        
        if(cMin === cMax) {
          H = 0, S = 0;
        } else {
          S = L < 0.5 ? (cMax-cMin)/(cMax+cMin) : (cMax-cMin)/(2-cMax-cMin);
          if(rD === cMax) {
            H = (gD-bD)/(cMax-cMin)
          } else if(gD === cMax) {
            H = 2 + (bD-rD)/(cMax-cMin)
          } else {
            H = 4 + (rD-gD)/(cMax-cMin)
          }
        }
        H *= 60;
        H = H < 0 ? H + 360 : H;
        
        return [parseInt(H),parseInt(S * 100),parseInt(L * 100)];
      }
    }
    
    var covertFromRGBtoString = {
      rgb : function(r, g, b){
        return 'rgb('+r+','+g+','+b+')'
      },
      hsl : function(r, g, b){
        var c = convertFromRGB.hsl.apply(this, arguments)
        return 'hsl('+ c[0] +','+ c[1] +'%,'+ c[2] +'%)';
      },
      hex : function(r, g, b){
        var c = convertFromRGB.hex.apply(this, arguments);
        return '#' + c[0] + c[1] + c[2] 
      }
    }
    
    function decTo2digitHex(dec) {
      var hex =  dec.toString(16);
      return hex.length < 2 ? '0' + hex : hex;
    }
    
    return {
        init : function(options) {
          document.body.focus();
          
          var opts = options || {};
          var sliderId = opts.sliderId || 'slider';
          var canvasId = opts.canvasId || 'canvas';
          var textBoxId = opts.textBoxId || 'color-text';
          var colorBoxId = opts.colorBoxId || 'color';
          var tolerance = opts.tolerance || 30;
          
          _mode = opts.mode || 'hex';  
          _cWidth = opts.canvasWidth || 400;
          _cHeight = opts.canvasHeight || 400;
          _selectedColor = opts.selectedColor || [255,255,255]; // in rgb mode
          
          var initHsl = convertFromRGB.hsl.apply(this, _selectedColor);
          var initHue = initHsl[0];
          
          picker.create(canvasId, _cWidth, _cHeight, tolerance);
          picker.bindEvents(); 
          
          slider.create(sliderId, _cWidth, initHue);
          slider.bindEvents(); 
          
          text.create(textBoxId, colorBoxId); 
          text.bindEvents();       
          
          dynamic.renderColorAll({rgb : _selectedColor});         
        },
        
        detectOS :  function(selector) {
          var nav = window.navigator;
          var platform = nav.platform.toLowerCase();
          _isMac = platform.search('mac') != -1; 
          var els = document.querySelectorAll(selector);
          for (var i = 0, len = els.length; i < len; i++) {
            els[i].innerHTML = _isMac ? 'cmd' : 'ctrl';
          }
        }
    }
})();