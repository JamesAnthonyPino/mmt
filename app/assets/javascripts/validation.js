// Error messages to the user can be improved by extracting & displaying data from the schema regarding things like field length, minItems, etc.

// These arrays should probably be eliminated and the Rails ones accessed instead.
var ACQUISITION_INFORMATION_FIELDS = [
  'Platforms',
  'Projects'
];
var DATA_IDENTIFICATION_FIELDS = [
  'EntryId',
  'Version',
  'EntryTitle',
  'Abstract',
  'Purpose',
  'DataLanguage',
  'DataDates',
  'Organizations',
  'Personnel',
  'CollectionDataType',
  'ProcessingLevel',
  'CollectionCitations',
  'CollectionProgress',
  'Quality',
  'UseConstraints',
  'AccessConstraints',
  'MetadataAssociations',
  'PublicationReferences'
];
var DESCRIPTIVE_KEYWORDS_FIELDS = [
  'ISOTopicCategories',
  'ScienceKeywords',
  'AncillaryKeywords',
  'AdditionalAttributes'
];
var DISTRIBUTION_INFORMATION_FIELDS = [
  'RelatedUrls',
  'Distributions'
];
var METADATA_INFORMATION_FIELDS = [
  'MetadataLanguage',
  'MetadataDates'
];
var SPATIAL_EXTENT_FIELDS = [
  'SpatialExtent',
  'TilingIdentificationSystem',
  'SpatialInformation',
  'SpatialKeywords'
];
var TEMPORAL_EXTENT_FIELDS = [
  'TemporalExtents',
  'TemporalKeywords',
  'PaleoTemporalCoverage'
];

var FORM_FIELDS = [
  {formName: 'data_identification', fields: DATA_IDENTIFICATION_FIELDS},
  {formName: 'descriptive_keywords', fields: DESCRIPTIVE_KEYWORDS_FIELDS},
  {formName: 'metadata_information', fields: METADATA_INFORMATION_FIELDS},
  {formName: 'temporal_extent', fields: TEMPORAL_EXTENT_FIELDS},
  {formName: 'spatial_extent', fields: SPATIAL_EXTENT_FIELDS},
  {formName: 'acquisition_information', fields: ACQUISITION_INFORMATION_FIELDS},
  {formName: 'distribution_information', fields: DISTRIBUTION_INFORMATION_FIELDS}
];

function compactAllArrays(obj) {
  // After the page's Json is built, get rid of empty elements in arrays.
  var k;
  var i;
  if (!Array.isArray(obj) && obj instanceof Object) {
    for (k in obj) {
      compactAllArrays(obj[k]);
    }
  } else {
    if (Array.isArray(obj)) {
      for (i = 0; i < obj.length; i++) {
        if (obj[i] === null || obj[i] === undefined) {
          obj.splice(i,1);
          i--;
        }
      }
      for (i = 0; i < obj.length; i++) {
        compactAllArrays(obj[i]);
      }
    }
  }
  return obj;
}

function handleDescriptiveKeywordForm(json) {
  // Science Keywords are not created or represented like other data, and so require special handling
  var fieldNames = ['Category', 'Topic', 'Term', 'VariableLevel1', 'VariableLevel2', 'VariableLevel3', 'DetailedVariable'];
  var keywordArray = [];
  var keywordCount = 0;

  // Find each keyword on page
  $('.selected-science-keywords input').each(function() {
    // Parse the keyword value and insert it into Json for validation
    var keywordSegmentArray = $(this).val().split('>');
    var thisJson = {};
    for (var i = 0; i < fieldNames.length; i++) {
      var fieldName = fieldNames[i];
      var keyword = keywordSegmentArray[i];
      if (keyword === undefined || keyword === null) {
        break;
      }
      keyword = keyword.trim();
      thisJson[fieldName] = keyword;
    }
    // clone the json before adding it
    keywordArray[keywordCount] = JSON.parse(JSON.stringify(thisJson));
    keywordCount += 1;
  });

  if (keywordArray.length > 0) {
    // clone the json before adding it
    json.ScienceKeywords = JSON.parse(JSON.stringify(keywordArray));
  }

}

function buildJsonForPage() {
  // Build and return the json to be validated, using only all the information on this form.
  // TODO - Enhance code to handle processing the data coming back from a multi-select into json for validation. Then add "validate" class to all such fields, like draft_iso_topic_categories
  var rootJson = {};

  $('.validate').each(function() {
    if ($(this).val().length !== 0) { // skip fields that are empty
      // Get the path of this
      var thisPathArray = getObjPathArray($(this));

      // Loop down through the path. Add missing elements to JsonForPage
      var jsonFragment = rootJson;
      // Skip first element of "Draft"
      for (var i = 1; i < thisPathArray.length; i++) {
        var pathFragment = thisPathArray[i];

        if (pathFragment.match(/^[0-9]+$/) === null) {
          // Not an array subscript. Is it already in the json at this level?
          if (jsonFragment[pathFragment]) {
            // found, continue down path
            jsonFragment = jsonFragment[pathFragment]; // Prepare for the next iteration of the for loop.
            continue;
          } else {
            // Not yet present. Need to insert this and everything following it in thisPathArray.
            var returnedJson = createJsonFragment(thisPathArray.slice(i + 1).reverse(), $(this));
            jsonFragment[pathFragment] = returnedJson;
            break;
          }
        } else { // pathFragment is an array index
          var index = parseInt(pathFragment);
          // If this index will be new then insert this and everything following it in thisPathArray.
          if (jsonFragment[index] === undefined) {
            jsonFragment[index] = createJsonFragment(thisPathArray.slice(i + 1).reverse(), $(this));
            break;
          } else {
            // This array member already exists. Prepare for the next iteration of the for loop.
            jsonFragment = jsonFragment [index];
          }
        }
      }
    }
  });

  rootJson = compactAllArrays(rootJson);

  return rootJson;
}

function createJsonFragment(objPathArray, obj) {
  // An entire branch of the Json is not yet present. Create and return it.
  var json = {};
  var objValue = convertObj(obj);

  if (objPathArray.length === 0) {
    return objValue;
  }

  for (var i = 0; i < objPathArray.length; i++) {
    // TODO - find more efficient way of adding outer layers of json to a json object
    var oldJson;
    if (i === 0) {
      // Initially set this for innermost value
      oldJson = objValue;
    } else {
      // clone the json before adding it
      oldJson = JSON.parse(JSON.stringify(json));
    }
    json = {};
    if (objPathArray[i].match(/^[0-9]+$/) === null) {
      json[objPathArray[i]] = oldJson;
    } else { // handle arrays, including out of order insertions
      var newArray = [];
      newArray[parseInt(objPathArray[i])] = oldJson;
      json = newArray;
    }
  }
  return json;
}

function createUserValidationMessage(error, messageType) {
  // Create a user-friendly error message
  var errorKeyword = error.keyword;
  var errorPath = error.path;
  var errorObj = error.obj;

  // Get the name of the object into presentable form
  var objName = '';
  if (messageType === 'summary') {
    var pathArray = errorPath.split('.');
    // Is an array index. Don't use for name
    if (pathArray[pathArray.length - 1].match(/^[0-9]+$/)) {
      pathArray.pop();
    }
    // Camel case to title
    objName = pathArray[pathArray.length - 1].replace(/([A-Z])/g, ' $1');
    switch (objName) {
      case ' U R Ls':
        objName = 'URLs';
        break;
      case ' D O I':
        objName = 'DOI';
        break;
      case ' I S B N':
        objName = 'ISBN';
        break;
    }
    objName += ': ';
  }

  // Create options to pass in depending on error type
  var option = null;
  if (errorKeyword === 'type') {
    option = 'string';
    if (errorObj.hasClass('mmt-number')) {
      option = 'number';
    } else if (errorObj.hasClass('mmt-integer')) {
      option = 'integer';
    } else if (errorObj.hasClass('mmt-boolean')) {
      option = 'boolean';
    } else if (errorObj.hasClass('mmt-date-time')) {
      option = 'date-time';
    } else if (errorObj.hasClass('mmt-uri')) {
      option = 'URI';
    } else if (errorObj.hasClass('mmt-uuid')) {
      option = 'uuid';
    }
  }

  var message = translateValidationMessage(errorKeyword, [option]);

  return objName + message;
}

// Note - portions of this file were derived from the work found here: https://github.com/josdejong/jsoneditor/

function translateValidationMessage(key, variables) {
  var lang = englishValidationMessages;
  var string = lang[key];

  if (typeof string === 'undefined') {
    string = 'Unknown error string: ' + key;
  }

  if (variables) {
    for (var i = 0; i < variables.length; i++) {
      string = string.replace(new RegExp('\\{\\{' + i + '}}','g'),variables[i]);
    }
  }

  return string;
}

var englishValidationMessages = {
  required: 'Value required',
  type: 'Value must be of type {{0}}',
  anyOf: 'Value must validate against at least one of the provided schemas',
  not: 'Value must not validate against the provided schema',
  additionalItems: 'No additional items allowed in this array',
  uniqueItems: 'Array must have unique items',

  enum: 'This is not one of the allowed values',
  exclusiveMaximum: 'Value is too high',
  maximum: 'Value is too high',
  exclusiveMinimum: 'Value is too low',
  minimum: 'Value is too low',
  multipleOf: 'Value must be a multiple of a given number',
  maxLength: 'Value is too long',
  minLength: 'Value is too short',
  pattern: 'Value must match the provided pattern',
  format: 'Value must match the provided pattern',
  minItems: 'Value has too few items',
  maxItems: 'Value has too many items',
  //maxProperties: 'Object must have at most {{0}} properties',
  //minProperties: 'Object must have at least {{0}} properties',
  //additionalProperties: 'No additional properties allowed, but property "{{0}}" is set',
  //dependencies: 'Must have property "{{0}}"',
  oneOf: 'Value must validate against exactly one of the provided schemas',
  date_time: 'This is not a valid RFC3339 date-time. Needs to look like "2015-08-01T00:00:00Z"'

  //enum: '"{{0}}" is not one of the allowed values',
  //exclusiveMaximum: 'Value must be less than {{0}}',
  //maximum: 'Value must at most {{0}}',
  //exclusiveMinimum: 'Value must be greater than {{0}}',
  //minimum: 'Value must be at least {{0}}',
  //multipleOf: 'Value must be a multiple of {{0}}',
  //maxLength: 'Value must be at most {{0}} characters long',
  //minLength: 'Value must be at least {{0}} characters long',
  //pattern: 'Value must match the provided pattern of "{{0}}"',
  //format: 'Value must match the provided pattern of "{{0}}"',
  //minItems: 'Value must have at least {{0}} items',
  //maxItems: 'Value must have at most {{0}} items',
  //maxProperties: 'Object must have at most {{0}} properties',
  //minProperties: 'Object must have at least {{0}} properties',
  //additionalProperties: 'No additional properties allowed, but property "{{0}}" is set',
  //dependencies: 'Must have property "{{0}}"',
  //oneOf: 'Value must validate against exactly one of the provided schemas. It currently validates against {{0}} of the schemas',
  //date_time: '"{{0}}" is not a valid RFC3339 date-time. Needs to look like "2015-08-01T00:00:00Z"'
};

function convertObj(obj) {
  // Convert the string value of an object into its Json value type.
  var objValue = obj.val();
  if (obj.hasClass('mmt-number')) {
    if (isNaN(parseFloat(objValue)) || !isFinite(objValue)) { // See http://run.plnkr.co/plunks/93FPpacuIcXqqKMecLdk/
      //objValue = NaN;
    } else {
      objValue = parseFloat(objValue);
    }
  } else if (obj.hasClass('mmt-integer')) {
    if (parseInt(objValue) === Number(objValue)) { // See http://run.plnkr.co/plunks/93FPpacuIcXqqKMecLdk/
      objValue = parseInt(objValue);
    }
  } else if (obj.hasClass('mmt-boolean')) {
    objValue = objValue === 'true';
  }
  return objValue;
}

// Return an array of all the path element fragments for an object
function getObjPathArray(obj) {
  var objPathArray = obj.attr('name').replace(/]/g, '').split('[');
  var newArray = [];
  for (var i = 0; i < objPathArray.length; i++) {
    var pathFragment = objPathArray[i];
    if (pathFragment.length > 0) {
      switch (pathFragment) {
        case 'urls':
          pathFragment = 'URLs';
          break;
        case 'doi':
          pathFragment = 'DOI';
          break;
        case 'isbn':
          pathFragment = 'ISBN';
          break;
      }
      newArray.push(snakeToCamel(pathFragment));
    }
  }
  return newArray;
}

// get rid of erroneous repetitions in Jsen path
// function fixJsenPathProblem(path) {
  //var pathSegments = path.split('.');
  //for (var i=0; i < pathSegments.length; i++) {
  //  if (pathSegments[i] === pathSegments[i+1]) {
  //    pathSegments = pathSegments.slice(0, i) + pathSegments.slice(i+1);
  //    i--;
  //  }
  //}
  //path = pathSegments.join('.');

//  return path;
//}

// Given an error path value (i.e. 'X.Y.1.CamelCase'), figure out what the obj id should be
function pathToObjId(path) {
  // Address an error in JSEN by first splitting the path & recombining.
  //path = fixJsenPathProblem(path);
  var objId = 'draft.' + path;
  // Camel to snake
  objId = objId.replace(/([A-Z])/g, function($1) {
    return '_' + $1.toLowerCase();
  });
  objId = objId.replace(/\._/g, '_');
  objId = objId.replace(/\./g, '_');

  objId = objId.replace(/u_r_ls/g, 'urls');
  objId = objId.replace(/d_o_i/g, 'doi');
  objId = objId.replace(/i_s_b_n/g, 'isbn');
  return objId;
}

function errorAppliesToThisPage(formName, error) {
  // Does this error apply to this page?
  var errorLocation = error.path.split('.')[0];

  for (var i = 0; i < FORM_FIELDS.length; i++) {
    var thisForm = FORM_FIELDS[i];
    if (formName === thisForm.formName) {
      for (var j = 0; j < thisForm.fields.length; j++) {
        if (errorLocation === thisForm.fields[j]) {
          return true;
        }
      }
    }
  }

  return false;
}

function getInlineErrorDisplayId(obj) {
  // Return a consisten id for an object's error message display object
  var objId = obj.attr('id');
  return objId + '_errors';
}

function updateInlineErrorsForField(obj, errorArray) {
  // Erase & redraw the inline error message(s) for this object
  if (obj.is(':hidden')) {
    return;
  }

  removeDisplayedInlineErrorsForField(obj);

  // Display new error element under field
  var inlineErrorDisplayId = getInlineErrorDisplayId(obj);
  if (errorArray.length > 0) {
    var newObj = '<div id="' + inlineErrorDisplayId + '" class="banner banner-danger validation-error-display"><i class="fa fa-exclamation-triangle"></i>';
    for (var i = 0; i < errorArray.length; i++) {
      var error = errorArray[i];
      var userMessage = createUserValidationMessage(error, 'inline');
      newObj += userMessage + '.</br>';
    }
    newObj += '</div>';
    $(newObj).insertAfter('#' + obj.attr('id'));
  }
}

// Return just the errors that are relevant to this obj
function collectRelevantErrors(obj, errors) {
  var relevantErrors = [];
  var targetObjId = obj.attr('id');

  for (var i = 0; i < errors.length; i++) {
    var error = errors[i];
    //alert('Checking ' + errors[i].path + ' for ' + objPathArray[0] + ' Finding ' + errors[i].path.indexOf(objPathArray[0]));
    var objId = pathToObjId(error.path);
    if (targetObjId === objId) {
      error.obj = obj;
      relevantErrors.push(error);
    }
  }
  return relevantErrors;
}

function removeDisplayedInlineErrorsForField(obj) {
  // Remove previous inline error display element (if any)
  var inlineErrorDisplayId = getInlineErrorDisplayId(obj);
  var errorDisplay = document.getElementById(inlineErrorDisplayId);
  if (errorDisplay) {
    errorDisplay.parentNode.removeChild(errorDisplay);
  }
}

function scrollToLabel(target) {
  // Find the label for this target & scroll it into view. If no label, scroll to the field itself
  var label = $("label[for='" + target + "']")[0];
  if (label) {
    label.scrollIntoView(true);
  } else {
    $('#' + target)[0].scrollIntoView(true);
  }
}

function snakeToCamel(str) {
  var newStr = str.replace(/(\_\w)/g, function(m) {
    return m[1].toUpperCase();
  });
  newStr = newStr[0].toUpperCase() + newStr.slice(1);
  return newStr;
}

function handleFormValidation(updateSummaryErrors, updateInlineErrors) {
  // Do the validation for the entire page

  var jsonForPage = buildJsonForPage();
  var validate = jsen(globalJsonSchema, {greedy: true});

  // Prepare to ignore errors for objects that are not on this page
  var formName = document.getElementById('mmt-form-name').value;

  // If on Descriptive Keywords page need to apply special handling to extract & add keywords
  if (formName === 'descriptive_keywords') {
    handleDescriptiveKeywordForm(jsonForPage);
  }

  var valid = validate(jsonForPage);

  //console.log(JSON.stringify(jsonForPage));

  // Because our required fields are spread over multiple pages and we only validate data from this one, there will always be errors

  var relevantErrors = [];
  var i;
  for (i = 0; i < validate.errors.length; i++) {
    var error = validate.errors[i];
    if (errorAppliesToThisPage(formName, error)) {
      //console.log(JSON.stringify(error));
      var objId = pathToObjId(error.path);
      var obj = $('#' + objId);
      error.obj = obj;
      relevantErrors.push(error);
    }
  }

  if (updateInlineErrors) {
    // Start off by removing all previous Inline error display elements (if any). They will be regenearted if needed.
    $('.validation-error-display').remove();
  }

  if (updateSummaryErrors) {
    // Remove previous Summary error display element (if any)
    var summaryErrorDisplayId = 'summary-error-display';
    var errorDisplay = document.getElementById(summaryErrorDisplayId);
    if (errorDisplay) {
      errorDisplay.parentNode.removeChild(errorDisplay);
    }
  }

  if (relevantErrors.length > 0) {
    if (updateSummaryErrors) {
      // Make sure the errors are sorted by path for display. THis will group them.
      relevantErrors = relevantErrors.sort(function(a, b) {
        return a.path === b.path ? 0 : +(a.path > b.path) || -1;
      });

      var newElement = '<div id="' + summaryErrorDisplayId +
      '" class="banner banner-danger"><i class="fa fa-exclamation-triangle"></i>' +
      'Click on any blue error message to go directly to that field:</br>';

      for (i = 0; i < relevantErrors.length; i++) {
        var error = relevantErrors[i];
        var userMessage = createUserValidationMessage(error, 'summary');
        var errorString;
        if (error.obj[0] === undefined) {
          errorString = userMessage + '.</br>';
        } else {
          var objId = error.obj.attr('id');
          errorString = '<a href="javascript:scrollToLabel(\'' + objId + '\');">' + userMessage + '.</a></br>';
        }
        newElement += errorString;
      }
      newElement += '</div>';

      // Insert in the proper DOM location
      var element = document.getElementsByClassName('nav-top');
      element[0].insertAdjacentHTML('afterend', newElement);
    }

    if (updateInlineErrors) {
      for (i = 0; i < relevantErrors.length; i++) {
        var errorsForThisObj = [];
        var indexToObj = i;
        for (var j = i; j < relevantErrors.length; j++) {
          if (relevantErrors[i].obj === relevantErrors[j].obj) {
            errorsForThisObj.push(relevantErrors[j]);
          } else {
            i = j - 1;
            break;
          }
        }
        updateInlineErrorsForField(relevantErrors[indexToObj].obj, errorsForThisObj);
      }
    }

    if (updateSummaryErrors) {
      return confirm('This page has invalid data. Are you sure you want to save it and proceed?');
    }
  }

  return true;
}

function handleFieldValidation(obj) {
  // Validate this field

  var jsonForPage = buildJsonForPage();

  var validate = jsen(globalJsonSchema, {greedy: true});

  validate(jsonForPage);

  // Remove errors that do not apply
  var errorArray = collectRelevantErrors(obj, validate.errors);

  updateInlineErrorsForField(obj, errorArray);

  return errorArray;
}

$(document).ready(function() {
  // set up validation call
  $('.validate').blur(function() {
    handleFieldValidation($(this));
  });

  // Handle form navigation
  $('.next-section').change(function() {
    if (handleFormValidation(true, true)) {
      $('#new_form_name').val(this.value);
      this.form.submit();
    }
  });
});