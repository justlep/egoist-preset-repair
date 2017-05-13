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
            ABSOLUTE_WINDOWS_PATH_REGEX = /^([a-z]:\\)/i,
            ABSOLUTE_LINUX_PATH_REGEX = /^(~?\/)/,
            lengthDifference = this.currentPath.length - newPath.length,
            lengthDifferenceArray = new Array(lengthDifference),
            newPaddedPath;

        if (!lengthDifference) {
            newPaddedPath = newPath;

        } else if (ABSOLUTE_WINDOWS_PATH_REGEX.test(newPath)) {
            // Windows ignores multiple backslashes, allowing padding like
            // F:\temp\xx.wav ==> F:\\\\\\temp\xx.wav
            newPaddedPath = newPath.replace(ABSOLUTE_WINDOWS_PATH_REGEX, ['$1'].concat(lengthDifferenceArray).join('\\'));

        } else if (ABSOLUTE_LINUX_PATH_REGEX.test(newPath)) {
            // Linux ignores multiple slashes, allowing padding like
            // ~/temp/xx.wav ==> ~////temp/xx.wav    or
            // /temp/xx.wav  ==> /////temp/xx.wav
            newPaddedPath = newPath.replace(ABSOLUTE_LINUX_PATH_REGEX, ['$1'].concat(lengthDifferenceArray).join('/'));

        } else {
            // otherwise just pad with trailing spaces
            newPaddedPath = [newPath].concat(lengthDifferenceArray).join(' ');
        }

        console.log('Generated padded path:\n' +
            'CURRENT:    "%s"\n' +
            'NEW RAW:    "%s"\n' +
            'NEW PADDED: "%s"',
            this.currentPath, newPath, newPaddedPath);

        if (newPaddedPath.length !== this.currentPath.length) {
            throw new Error('Whoops, newPaddedPath length doesnt match old length');
        }

        return newPaddedPath;
    }
};

/**
 * @static
 */
ReplaceableSample.test = function() {
    console.log('Running tests...');

    [
        // [<old>, <new-raw>, <expected-new-padded>]
        ['c:\\test.wav', 'c:\\te.wav', 'c:\\\\\\te.wav'],
        ['c:\\test.wav', 'c:\\test.wav', 'c:\\test.wav'], // idem
        ['c:\\test.wav', 'test.wav', 'test.wav   '],
        ['/test.wav', 'test.wav', 'test.wav '],
        ['/test.wav', '/test.wav', '/test.wav'], // idem
        ['/temp/test.wav', '/temp/xx.wav', '///temp/xx.wav'],
        ['~/temp/test.wav', '~/temp/xx.wav', '~///temp/xx.wav'],
        ['~/temp/test.wav', '~/temp/test.wav', '~/temp/test.wav'] // idem
    ].forEach(function(testPaths) {
        var oldPath = testPaths[0],
            newPath = testPaths[1],
            expectedPaddedPath = testPaths[2],
            lengthBytes = String.fromCharCode(oldPath.length) + new Array(4).join(String.fromCharCode(0)),
            sample = new ReplaceableSample(lengthBytes, oldPath),
            paddedNewPath;

        sample.newPath(newPath);
        paddedNewPath = sample.getFinalPaddedNewPath();

        if (paddedNewPath !== expectedPaddedPath) {
            console.warn('Test failed for %o.\nExpected: "%s"\nActual:   "%s"', JSON.stringify(testPaths), expectedPaddedPath, paddedNewPath);
            throw new Error('Test failed');
        }
    });

    console.log('All tests passed');
};

// always test up front, so what
ReplaceableSample.test();