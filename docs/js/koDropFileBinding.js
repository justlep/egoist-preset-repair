/**
 * Example:
 *  <div data-bind="dropFile: {callback: setFile, accept: ['.txt','.doc'] }"/>
 *  <div data-bind="dropFile: {callback: setFile, accept: /\.(txt|doc)$/i }"/>
 *  <input type="file" data-bind="dropFile: {callback: setFile, accept: ['.txt','.doc'] }"/>
 *  <input type="file" data-bind="dropFile: {callback: setFile }"/>
 */
(function(ko) {

    var getValidFileFromEvent = function(e, regex) {
            var files = (e.dataTransfer || e.target || {}).files,
                file = files && files.length && files[0],
                isValid = file && (!regex || regex.test(file.name));

            return isValid ? file : null;
        },
        onDragOver = function(e) {
            e.preventDefault();
        };

    ko.bindingHandlers.dropFile = {
        init: function(elem, valueAccessor, allBindings, viewModel, bindingContext) {
            var isFileInput = elem.nodeName.toLowerCase() === 'input' && elem.type === 'file',
                opts = valueAccessor(),
                accept = opts.accept || null,

                filenameRegex = !accept ? null :
                    (accept instanceof RegExp) ? accept :
                        (accept instanceof Array && accept.length) ?
                            new RegExp('('+ accept.join('|').replace(/\./g,'\\.') + ')$','i') :
                            null,
                onDropOrChange = function(e) {
                    e.preventDefault();

                    var validFile = getValidFileFromEvent(e, filenameRegex);
                    if (validFile) {
                        opts.callback(validFile);
                    } else {
                        console.log('Skipping invalid file');
                    }
                };

            // console.log('filenameRegex: %o', filenameRegex);

            if (isFileInput) {
                ko.utils.registerEventHandler(elem, 'change', onDropOrChange);
                if (accept instanceof Array && accept.length) {
                    elem.setAttribute('accept', accept.join(','));
                }
            } else {
                ko.utils.registerEventHandler(elem, 'drop', onDropOrChange);
                ko.utils.registerEventHandler(elem, 'dragover', onDragOver);
            }
        }
    };

})(ko);

