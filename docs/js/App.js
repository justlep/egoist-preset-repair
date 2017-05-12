



/**
 * @constructor
 */
function App() {
    var self = this,
        PRESET_SUFFIX_REGEX = /\.sbep$/i,
        SAMPLE_SEARCH_REPLACE_REGEX = /([^\x00][\x00-\xff]{2}[\x00])([^\x00]+?\.(?:wav|aif)\x20*?)([\x00]+)/ig,
        blob = ko.observable(),
        _presetFile = ko.observable();

    this.ALLOWED_PRESET_FILE_EXTENSIONS = ['.sbep'];

    this.presetFile = ko.computed({
        read: _presetFile,
        write: function(file) {
            var isValidFile = PRESET_SUFFIX_REGEX.test(file.name || '');
            _presetFile(isValidFile ? file : null);
        }
    });

    this.isBrowserSupported = (window.File && window.FileReader && window.FileList && window.Blob);

    this.error = ko.observable();

    this.newPresetFilename = ko.observable('');
    this.presetFilename = ko.computed(function() {
        var f = self.presetFile(),
            filename = f && f.name.replace(/$.*[\\/]/, '');

        self.newPresetFilename(filename && filename.replace(PRESET_SUFFIX_REGEX, '-repaired.sbep'));
        return filename;
    });

    this.isNewFilenameValid = ko.computed(function() {
        return (/[^\\/]+\.sbep$/i).test(self.newPresetFilename() || '');
    });

    this.presetFile.subscribe(function(f) {
        if (!f) {
            return blob(null);
        }
        var reader = new FileReader();
        reader.onload = function(loadEvent) {
            blob(loadEvent.target.result);
        };
        reader.onerror = function(e) {
            self.error('Error loading preset');
            blob(null);
            console.error(e);
        };
        reader.readAsBinaryString(f);
    });

    this.samples = ko.computed(function() {
        var fileContent = blob() || '',
            replaceableSamples = [],
            matchMap = {};

        fileContent.replace(SAMPLE_SEARCH_REPLACE_REGEX, function(match, lengthBytes, samplePath) {
            var alreadyFound = matchMap[match],
                replaceableSample;

            if (!alreadyFound) {
                try {
                    replaceableSample = new ReplaceableSample(lengthBytes, samplePath)
                    replaceableSamples.push(replaceableSample);
                    matchMap[match] = replaceableSample;
                } catch (e) {
                    console.warn('Skipped match: %s', match);
                }
            }
        });

        return replaceableSamples;
    });

    this.getFixedFileContent = function() {
        var changedSamplesByCurrentPath = {};

        self.samples.peek().filter(function(s) {
            if (s.isChanged.peek()) {
                changedSamplesByCurrentPath[s.currentPath] = s;
                return true;
            }
            return false;
        });

        return (blob.peek()||'').replace(SAMPLE_SEARCH_REPLACE_REGEX, function(match, lengthBytes, samplePath, zeroes) {
            var replaceableSample = changedSamplesByCurrentPath[samplePath];

            if (replaceableSample) {
                return '' + lengthBytes + replaceableSample.getFinalPaddedNewPath() + zeroes;
            } else {
                return match;
            }
        });
    };

    this.canDownload = ko.computed(function() {
        var samples = self.samples();
        for (var i=0; i<samples.length; i++) {
            if (!samples[i].isValid()) {
                return false;
            }
        }
        return true;
    });

    this.downloadUrl = ko.observable('');

    this.download = function() {
        // var blobUrl = URL.createObjectURL(blob() || 'abc'); // TODO use new blob
        // self.downloadUrl(blobUrl);
        var dataUrl = 'data:text/csv;charset=utf-8;base64,' + btoa(self.getFixedFileContent());
        self.downloadUrl(dataUrl);
        setTimeout(function() {
            ko.utils.triggerEvent(document.getElementById('hiddenDownloadLink'), 'click');
        }, 200);
    };
}

App.init = function() {
    ko.applyBindings(new App());
};