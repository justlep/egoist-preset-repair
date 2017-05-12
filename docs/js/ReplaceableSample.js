/**
 * @constructor
 */
function ReplaceableSample(lengthBytes, samplePath) {
    var self = this,
        isLengthBytesValid = lengthBytes && lengthBytes.length === 4,
        length = isLengthBytesValid &&
            lengthBytes.charCodeAt(0) +
            (lengthBytes.charCodeAt(1) << 8) +
            (lengthBytes.charCodeAt(2) << 16) +
            (lengthBytes.charCodeAt(3) << 24);

    if (!isLengthBytesValid || samplePath.length < 4) {
        throw new Error('Invalid lengthBytes or samplePath');
    }

    this.ALLOWED_SAMPLE_FILE_EXTENSIONS = ['.aif', '.wav'];

    this.lengthBytes = lengthBytes;
    this.currentPath = samplePath;
    this.currentPathTrimmed = samplePath.replace(/(?:^\s*|\s*$)/g,'');
    this.length = length;

    this.newPath = ko.observable();
    this.resetNewPath();

    this.isChanged = ko.computed(function() {
        return self.newPath() !== self.currentPathTrimmed;
    });

    this.isValid = ko.computed(function() {
        var newPath = self.newPath() || '',
            isLengthCompatible = newPath.length <= self.length;

        return isLengthCompatible && (/\.(wav|aif)$/i).test(newPath);
    });

    this.setNewSampleFile = function(file) {
        var filename = file.name,
            isValid = (/\.(wav|aif)/i).test(filename);

        // console.log(file);

        if (isValid) {
            self.newPath(filename);
            console.log('new length: %s, old length: %s', filename.length, self.length);
            if (filename.length > self.length) {

                self.stripPath();
            }
        }
    };
}

ReplaceableSample.prototype = {
    ACCEPTED_SAMPLE_EXTENSIONS: '.wav',
    stripPath: function() {
        this.newPath((this.newPath()||'').replace(/^.*[\\/]/,''));
    },
    resetNewPath: function() {
        this.newPath(this.currentPathTrimmed);
    },
    getFinalPaddedNewPath: function() {
        if (!this.isValid()) {
            throw new Error('Cannot get final padded path for ReplaceableSample ' + this.currentPath);
        }
        var newPath = this.newPath.peek(),
            newPaddedPath = [newPath].concat(new Array(this.currentPath.length - newPath.length)).join(' ');

        console.log('Generating final path:\nOLD: "%s"\nNEW: "%s"', this.currentPath, newPaddedPath);
        return newPaddedPath;
    }
};
