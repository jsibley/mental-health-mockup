//namespace datastore by page path, internally localStorage uses only host (dns:port)
var dataStoreNS = window.location.pathname;

function initializeDefaultSrc(control) {

    const defaultSrc = {
        //emulate a HTMLInputElement, type "checkbox", "radio"
        "checked": control.defaultChecked,
        //emulate a HTMLInputElement type "date", "number", "tel", "text", "textarea"
        "value": control.defaultValue,
        //emulate a HTMLSelectElement
        0: { "value": ""},
        selectedIndex: 0,
    };

    return defaultSrc;
}

function fnForFieldsetRadios(control, fn=function(radio){}){
    var childRadios = $(`fieldset[id=${control.id}] input[type=radio]`);

    for(radio of childRadios){
        fn(radio);
    }
}

function clearDisabledInputByType(control, alwaysClear=false){

    if(control.disabled || alwaysClear){
        setMemberByType(initializeDefaultSrc(control), control, control);
    }

    var inputEvent = new Event("input");

    control.dispatchEvent(inputEvent);

}

function setDependentDisabledState(clickedElement, specificRadio, specificTarget, stateOverride=false, disabledOverrideValue){

    var multiSource = false;
    var multiSourceState = false;

    if(specificRadio) {

        if(Array.isArray(specificRadio)){

            multiSource = true;

            for(radio of specificRadio){
                clickedElement = document.querySelector(radio);
                multiSourceState |= clickedElement.checked;
            }

            //if one of the specified elements is checked, then remove disabled attribute
            multiSourceState=!multiSourceState;

        } else {
            //console.log("setting clickedElement to ", specificRadio);
            clickedElement = document.querySelector(specificRadio);
        }
    }

    var el = clickedElement.parentElement;

    var targetState = !clickedElement.checked || clickedElement.selected;

    if(stateOverride){
        targetState = disabledOverrideValue;
    } else if (multiSource) {
        targetState = multiSourceState;
    }

    
    if(!specificTarget){
        //console.log('toggling state', clickedElement);
        while(el.nextElementSibling) {

            el = el.nextElementSibling;
            var targetEl = el.children[0];
            //console.log(el, el.children[0]);
            targetEl.disabled = targetState;

            clearDisabledInputByType(targetEl);
            //console.log('toggled disavbled on element with id', el.children[0].id);

        }
    } else {
        
        if(Array.isArray(specificTarget)) {
            
            for(target of specificTarget) {
                var targetEl = document.querySelector(target);
                targetEl.disabled = targetState;
                
                if($(`fieldset[id=${targetEl.id}] input[type=radio]`).length){
                    fnForFieldsetRadios(targetEl, function(radio){clearDisabledInputByType(radio, true)});
                }
                else{
                    clearDisabledInputByType(targetEl);
                }
            }

        } else {
            var targetEl = document.querySelector(specificTarget)
            targetEl.disabled = targetState;
            
            clearDisabledInputByType(targetEl);
        }
    }
};

function getIndexFromOptionValue(control, optionValue){

    var optionIndex = -1;
    
    var iteratedOption = 0;

    for(var iteratedOption=0; optionIndex==-1 && control[iteratedOption]; iteratedOption++){
        
        var curOption = control[iteratedOption];
        //console.log(iteratedOption, curOption);

        if(curOption.value == optionValue){
            //console.log(curOption);
            optionIndex = iteratedOption;
            
            //When the form is reset, the select will return to its default selection for this select input
            //console.log("setting as default selection");
            curOption.defaultSelected=true;
        }
            
    }

    return optionIndex;
}

function loadLocalSiteInfo(attach=false){

    //console.log("loading header selections from browser local storage");

    var storedSelectOptions = ["province", "district", "health-facility"];

    for(selectID of storedSelectOptions) {

        //console.log("looking for", selectID);

        var jQuerySelect = $("select[id="+selectID+"-select]");
        var DOMSelect = undefined;

        if(jQuerySelect) {
            DOMSelect = jQuerySelect[0];
        }

        var storageName = dataStoreNS+"mhf-"+selectID;

        if(DOMSelect && localStorage[storageName]){
            
            var optionIndex = getIndexFromOptionValue(DOMSelect, localStorage[storageName]);
            
            if(optionIndex) {
                DOMSelect.selectedIndex = optionIndex;
            }

        }

        if(attach && jQuerySelect) {
            //attach onChange handler to store province selection in local browser storage
            jQuerySelect.on("change", function(event){
                //console.log(this[this.selectedIndex].value);

                //this is built during handling of change event
                var storageName=dataStoreNS+"mhf-"+this.id.slice(0, this.id.lastIndexOf("-select"));
                //console.log("storage name", storageName);

                var prevOptionValue = localStorage[storageName];
                if(prevOptionValue != undefined) {

                    var prevOptionIndex = getIndexFromOptionValue(this, prevOptionValue);

                    var prevOptionSelected = this.options[prevOptionIndex];

                    //console.log(prevOptionID, prevOptionSelected);

                    //Remove default on previously stored option
                    prevOptionSelected.defaultSelected = false;
                }
                
                var newOptionSelected = this[this.selectedIndex];
                                        
                localStorage[storageName] = newOptionSelected.value;
                //Set this as the new default to return to when resetting the form
                newOptionSelected.defaultSelected = true;
            });
        }
    }
}

function setAllDisabledStates(){
    //onclick*='setDependentDisabledState'
    /*for(inputSetsDisabled of )){
        //console.log(inputSetsDisabled, inputSetsDisabled.checked, inputSetsDisabled.onclick);
        
        var onclick=String(inputSetsDisabled.onclick);
        
        var param = [];
        var argsStr = onclick.slice(onclick.indexOf("setDependentDisabledState(")+"setDependentDisabledState(".length, onclick.lastIndexOf(");"));

        param = argsStr.split(",");
        
        setDependentDisabledState(param[0]=="this"?clickedElement=inputSetsDisabled:param[0],specificRadio=param[1], specificTarget=param[2], stateOverride=true, disabledOverrideValue=true);
    }*/

    var disableDependencies = [
            {
                set: $("input[onclick*='setDependentDisabledState']"),
                handler: "onclick"
            },
            {
                set: $("[onchange*='setDependentDisabledState']"),
                handler: "onchange"
            }
    ];

    for(ontype of disableDependencies) {
        //onchange*='setDependentDisabledState'
        for(inputSetsDisabled of ontype.set){
            //console.log(inputSetsDisabled, inputSetsDisabled.checked, inputSetsDisabled.onchange);
            
            var onchange=String(inputSetsDisabled[ontype.handler]);
            
            var allParams = [];
            var argsStr = onchange.slice(onchange.indexOf("setDependentDisabledState(")+"setDependentDisabledState(".length, onchange.lastIndexOf(");"));

            //also splits arrays of targets which need to be rebuilt too
            allParams = argsStr.split(",");

            var paramArrayRanges=[];
            
            //console.log("allParams", allParams)

            //doesnt support nested arrays, neither does the function that is being called
            if(allParams.length>1){
                var foundArray=false;

                for(i=0; i<allParams.length; i++){
                    var param = allParams[i];
                    //selector like '[id=example]' also begins with '[', make sure there is more than one '[' in this param
                    //var segmentsAfterOpenBracket = param.split("[").length;

                    if(param.search(/\[ *('|"|`)/) != -1 ){
                        
                        paramArrayRanges[paramArrayRanges.length] = {
                            "beginArrayIndex": i,
                            "paramIndex": paramArrayRanges.length?paramArrayRanges[paramArrayRanges.length-1].paramIndex+1:i,
                        }

                        foundArray = true;
                        allParams[i] = param.replace(/\[ */, "");
                    }
                    //don't count a closing square bracket as an array if we havent found an open bracket
                    //a selector like '[id=example]' also ends with ']', there should be more than ']', (n+1 if n)
                    //in case someone decides to write (this, input[independent], [ input[id=dependent] ])
                    //var segmentsAfterCloseBracket = param.split("]").length;
                    if(foundArray && param.search(/('|"|`) *\]/) != -1 ){

                        paramArrayRanges[paramArrayRanges.length-1].endArrayIndex = i;
                        foundArray = false;
                        allParams[i] = param.replace(/\] *('|"|`) *\]/, "]'");
                    }
                }

                allParams = allParams.map(param => param.replace(/'/g, " ").trim());

                for(range of paramArrayRanges){
                    allParams[range.paramIndex] = allParams.slice(range.beginArrayIndex, range.endArrayIndex+1);
                }

                //if there were any arrays, move any remaining parameters forward, i.e. this, [], target
                if(paramArrayRanges.length){
                    var lastRange = paramArrayRanges[paramArrayRanges.length-1];
                    allParams.splice(lastRange.paramIndex+1, lastRange.endArrayIndex-lastRange.paramIndex);
                }

                allParams = allParams.slice(0, 3);
            }

            //console.log(argsStr, allParams, allParams[0]=="this");

            setDependentDisabledState(allParams[0]=="this"?clickedElement=inputSetsDisabled:allParams[0],allParams[1]=="undefined"?undefined:specificRadio=allParams[1], specificTarget=allParams[2], stateOverride=true, disabledOverrideValue=true);
        }
    }
}

function confirmReset(evt){
    var result = confirm('Are you sure you want to reset *ALL* patient inputs to defaults?');
    
    if(result==false)
    {
        //the user cancelled the reset, prevent the default form reset behavior
        evt.preventDefault();

    }else{
        //go through clearing and re-initilization of localdatastore without re-attaching inputs' event listeners
        initializeInputValuePersistence(reset=true);

        //the default behavior of form input type="reset" will be applied after this handler returns
    }

}

function warnMaxDateToday(dateInput, alertSelector){
    var todayDate = new Date();
    var todayStr = todayDate.toISOString().split('T')[0];
    console.log(todayStr, dateInput.value);
    
    var specifiedDay = new Date(dateInput.value);
    
    var alertjQuery = $(alertSelector);
    var alert = alertjQuery[0];

    var alertText = "";

    if(specifiedDay > todayDate){
        //dateInput.value = todayStr;
        alertText = "Specified date is after today."
        alertjQuery.addClass("bg-warning");
    } else{
        alertjQuery.removeClass("bg-warning");
    }
    
    console.log(alertText);

    alert.textContent = alertText;

}

function watchRange(control, alertSelector){
    var alert = $(alertSelector);
    
    if(control.value && (Number(control.value) < Number(control.min) || Number(control.value) > Number(control.max))){
        alert.removeAttr("hidden");
        alert[0].textContent = `Value is outside of range of ${control.min} to ${control.max}`;
    } else {
        alert.attr("hidden", "true");
        //alert[0].textContent = "";
    }
}

function calculateAge(dobDateInput, targetSelector){
    
    var specifiedDay = new Date(dobDateInput.value);
    
    if(isNaN(specifiedDay)) {
        return;
    }
    
    var todayDate = new Date();
    

    var ageDate = new Date(todayDate - specifiedDay);
    var age = ageDate.getFullYear() - new Date("1/1/1970").getFullYear()
    
    $(targetSelector)[0].value=age;
}

function calculateDOB(ageInput, targetSelector){

    var today = new Date();
    var specifiedDay = new Date(Number(today.getFullYear())-Number(ageInput.value), today.getMonth(), today.getDate());

    if(isNaN(specifiedDay)) {
        return;
    }

    $(targetSelector)[0].value=specifiedDay.toISOString().split("T")[0];
}


function setHiddenCheckbox(checkboxSelector, value){
    $(checkboxSelector)[0].checked = value;
}

//
function setMaxDateToToday(){
    var today =new Date().toISOString().split('T')[0];
    console.log(today);
    
    for(dateInput of $("input[type=date]")){
        dateInput.max=today;
    }
}

const dataStoreProto = JSON.stringify({"storageVersion": "0.1"})

function initializeLocalStore(clear){

    if(clear){
        delete localStorage[dataStoreNS];
    }

    if(!localStorage[dataStoreNS]){
        localStorage[dataStoreNS] = dataStoreProto;
    }
}

function setMemberByType(src, dest, control)
{
    //don't set disabled controls
    if(control.disabled){
        return;
    }

    if(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
        switch(control.type){
            case "checkbox":
            case "radio":
                dest.checked= src.checked;
                break;

            case "date":
            case "text":
            case "number":
            case "tel":
            case "textarea":
                dest.value= src.value;
                break;
        }
    } else if (control instanceof HTMLSelectElement) {
        
        if(dest instanceof HTMLSelectElement) {
            var optionIndex = getIndexFromOptionValue(control, src.value);

            dest.selectedIndex= optionIndex;
        }
        else {
            dest.value= src[src.selectedIndex].value;
        }
    }
}

function versionedDataStore(datastore, control){

    var result = {};

    //if(datastore.storageVersion > "0.2") { }
    //if(datastore.storageVersion > "0.1") { }
    if(datastore.storageVersion < 0.2 && datastore.storageVersion >= "0.1") {
        result = datastore[control.id];
    }

    return result;
}

function localDataStore(control, load){
    
    var src = control;
    var dest = {};
    var dataStore = {};

    try{
        
        dataStore = JSON.parse(localStorage[dataStoreNS]);
        
        dest = versionedDataStore(dataStore, control);

    } catch (e){

        initializeLocalStore(clear=true);

        dataStore = JSON.parse(localStorage[dataStoreNS]);
        dest = versionedDataStore(dataStore, control);
    }

    if(load){
        src = dest;
        dest = control;
    }

    if(!src){

        //if the local data store is uninitialized for this input during load, initialize it
        if(load){

            dest = dataStore[control.id] = {"class": control.constructor.name};

            //reasonable deep copy, avoid changing the prototype, if the default is something other
            src = initializeDefaultSrc(control);

        } else {
            return;
        }
    }

    setMemberByType(src, dest, control);
    
    //store entire JSON object back into localStorage
    localStorage[dataStoreNS]=JSON.stringify(dataStore);
}

function applyScrollPositionPersistence(){

    document.body.scrollTop = document.documentElement.scrollTop = localStorage[dataStoreNS+"currentScroll"];

    window.addEventListener('scroll', function(event){
        //"pick up where you left off"
        //store current page scroll (though it is set to 0 when selecting a new tab)
        //when reloading the page to view changes, this value will be used to scroll back to scroll position before page refresh
        
        //console.log(document.documentElement.scrollTop);
        //document.body.scrollTop remains 0 with sticky position on common header
        localStorage[dataStoreNS+"currentScroll"]=document.documentElement.scrollTop;
    });
}

function getFieldsetsWithRadios(){
    
    var fieldsets = jQuery.makeArray($('form#htmlform fieldset'));

    var fieldsetsWithRadios = fieldsets.filter( (fieldset) => {
        if(fieldset.id=="") {
            //console.log("Skipping", fieldset);
            return false;
        }

        //see if there are any child radios for the given fieldset
        var fieldsetHasRadios = $(`fieldset[id=${fieldset.id}] input[type=radio]`).length>0;
        
        //check if this fieldset has any children fieldsets (which may account for the radios we see)
        var isImmediateParent = $(`fieldset[id=${fieldset.id}] fieldset`).length==0;

        //if this is not a parent of fieldset and it has radio children, keep it
        return fieldsetHasRadios && isImmediateParent; 

        });

    return fieldsetsWithRadios;
}

function initializeInputValuePersistence(reset=false){
    
    var inputs = [];
    inputs = jQuery.makeArray($('form#htmlform input'));
    inputs = inputs.concat(jQuery.makeArray($('form#htmlform select')));
    
    var textAreas = jQuery.makeArray($('form#htmlform textarea'));
    inputs = inputs.concat(textAreas);

    var fieldsetsWithRadios = getFieldsetsWithRadios();

    //if just re-initializing, clear the local datastore
    initializeLocalStore(clear=(false||reset));

    //attach listener to locally store all data to all inputs
    for(input of inputs){

        //radios only generate their own input when checked is set to true (not when set to false implicitly), but when clearing disabled radios, the input event is still used to trigger storage to the localDataStore, so it is attached here, the fieldsets input listeners are attached to store all the child radios states whenever one in the fieldset is selected

            //if not resetting, attach event listeners (this only need to be done on document.ready())
            //if resetting local data store, don't re-attach input event listeners
            if(!reset){
                input.addEventListener("input", function oninputInputStore(event){localDataStore(this, load=false)});
            }
    
            //load locally stored data, if it exists, otherwise initialize data storage object
            localDataStore(input, load=true);
    }

    for(fieldset of fieldsetsWithRadios){

        //console.log(fieldset)
        
        //if not resetting, attach event listeners (this only need to be done on document.ready())
        //if resetting local data store, don't re-attach input event listeners
        if(!reset){
            
            //attach event listener to the radios parent fieldset
            fieldset.addEventListener("input", function oninputFieldsetStore(event){
                
                fnForFieldsetRadios(this, function storeRadioState(radio){ localDataStore(radio, load=false); });
            });
        }
        
        fnForFieldsetRadios(fieldset, function loadRadioState(radio){ localDataStore(radio, load=true); });

    }

}

var originalSubmitFn = null;

$(document).ready( 
    function () {

            //setMaxDateToToday();

            var settings = {};

            window.location.search.substr(1).split("&").map( (param) => {
                var settingValue = param.split("=");
                settings[settingValue[0]] = settingValue[1];

            } );

            //if in an HFE form, pathname will be the same, but GET param formId will differ when creating a form for a patient, id will differ when accessing the form from the HFE module pages
            if(settings.formId){
                dataStoreNS+="-id-"+settings.formId;
            } else if(settings.id) {
                dataStoreNS+="-id-"+settings.id;
            }

            //console.log(settings);

            if(settings.tabbed=="false"){
                
                //console.log("monolithic");
                
                //todo: make this default in html and apply these in tabbed, rather than remove, so browser w/o js will still see a usable form

                var tabContent = $("#tab-content-sections");

                //console.log(tabContent);
                tabContent.removeClass("tab-content");

                var panes = $(".tab-pane");

                //console.log(panes);

                for(pane of panes) { 
                    //console.log(pane);
                    $(pane).addClass("show");
                }

            }else{
                //console.log("tabbed version");
                
                var tabs = $("#section-tabs");

                //remove hidden attribute from tabs
                tabs.removeAttr("hidden");

                $("#"+sessionStorage[dataStoreNS+"visibleTab"]).tab('show');

                $('#section-tabs a').on('click', 
                    
                    function (event) {

                        event.preventDefault();

                        $(this).tab('show');

                        sessionStorage[dataStoreNS+"visibleTab"]=this.id;

                        document.body.scrollTop = document.documentElement.scrollTop = 0;

                    });

                //this is supposed to be handled for us already... but doesnt seem to be (previously selected tabs continue to show selected state without manually removing active)
                $('a[data-toggle="tab"]').on('shown.bs.tab', 
                    function (e) {
                        //e.target // newly activated tab
                        $(e.relatedTarget).removeClass("active");
                    });
            }


            applyScrollPositionPersistence();

            initializeInputValuePersistence(reset=false);
/*
            for(textarea of textAreas){
                textarea.addEventListener("input", function(event){localDataStore(this, load=false)});
            }
*/
            var templateProvidedValues = $("[id^=template-rendered]");

            for(value of templateProvidedValues){

                var targetControl = $(`[id=${value.dataset.targetId}`)[0];

                var value = value.textContent;

                if(targetControl.type == "date"){
                    try {
                        value = new Date(value).toISOString().split("T")[0];
                    } catch {
                        value = "";
                    }
                } else if( targetControl instanceof HTMLFieldSetElement) {
                    var radios = $(`fieldset[id=${targetControl.id}] input[type=radio]`);
                    for(radio of radios){
                        if( radio.value == value)
                        {
                            radio.checked = true;
                        }
                    }
                }



                targetControl.value = value;

                var inputEvent = new Event("input");

                targetControl.dispatchEvent(inputEvent);
            }
            
            $("[id=encounterDate] input[type=text]").on("focus",
                function bringDatePickerToFrontAndFixPosition(){
                    var datepicker = $("div[id=ui-datepicker-div]");
                    datepicker.css("z-index", 1000000);
                    datepicker.css("position", "fixed");
                    var parentInput = $(this);
                    var position = parentInput.position().top+/*parentInput.offset().top-$(window).scrollTop+*/parentInput.outerHeight(true);
                    datepicker.css("top", position);
            });

            ///$("a[onclick^='handleDeleteButton']").on("click",
            //function bringDeleteToFront(){
                var deletePopup = $("[id=confirmDeleteFormPopup]");
                if(deletePopup) {
                    deletePopup.css("z-index", 1000000);
                }
            //});
            

            if( settings.dev=="true" ) {

                $("input").toArray().forEach(function(elem){ $(elem).css("background-color", $(elem).attr("data-concept-id")?"green":"red")});

                $("textarea").toArray().forEach(function(elem){ $(elem).css("background-color", $(elem).attr("data-concept-id")?"green":"red")});

                $("select").toArray().forEach(function(elem){ $(elem).css("background-color", $(elem).attr("data-concept-id")?"green":"red")});

                $("option").toArray().forEach(function(elem){ $(elem).css("background-color", $(elem).attr("data-concept-id")?"green":"red")});

                var fieldsetsWithRadios = getFieldsetsWithRadios();

                fieldsetsWithRadios.forEach(function(elem){ $(elem).css("background-color", $(elem).attr("data-concept-id")?"green":"red")});
            }

            var form = $("form#htmlform");

            //by setting onreset using attr(), the html will show onreset="setAllDisabledStates();" (in recent chrome at least)
            form.attr("onreset", "setAllDisabledStates();");

            //store original submit function
            form[0].originalSubmitFn = form[0].submit;

            //"monkey-patch" submit function
            form[0].submit = function(){
                
                //use xhr to detect redirect
                var xhr = new XMLHttpRequest();
                xhr.onreadystatechange = function(e) {
                    
                    //wait for DONE state
                    //console.log(xhr.status, xhr.responseURL);
                    if (xhr.readyState == 4) {
                        
                        //if the final location differs from the current location,
                        //the submit succeeded and we got a redirect
                        if (window.location.href != xhr.responseURL) {
                            
                            initializeInputValuePersistence(reset=true);

                            //update the window location url
                            window.location.href = xhr.responseURL;
                        } else {
                            //may not be the most effecient impl. (might be... can't set document.documentElement)
                            //if not, call the old submit to get the error response in a way the user will see
                            form[0].originalSubmitFn();
                        }
                        
                    }

                }

                xhr.withCredentials = true;
                xhr.open("POST", window.location.href, true);
                
                xhr.send(new FormData(form[0]));
                
            };
                
            loadLocalSiteInfo(true);

	    if (form.attr("formuuid") === "fa3295cb-07d7-4554-972b-ce959d10732c") {
                alert("F/U Form!");

		var dxs = [ "F00", "F01", "F01.1", "F02", "F02.0", "F02.1", "F02.2", "F02.3", "F02.4", "F03", "F04", "F05", "F06", "F07", "F09", "F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19", "F20", "F20.0", "F20.1", "F20.2", "F20.3", "F20.4", "F20.5", "F20.6", "F20.8", "F20.9", "F21", "F22", "F22.0", "F23", "F23.0", "F23.1", "F23.2", "F23.3", "F23.8", "F23.9", "F24", "F25", "F25.0", "F25.1", "F25.2", "F25.8", "F25.9", "F28", "F29", "F30", "F30.0", "F31", "F32", "F33", "F34", "F34.0", "F40", "F40.0", "F40.1", "F40.2", "F41", "F41.0", "F41.1", "F42", "F43", "F43.0", "F43.1", "F43.2", "F44", "F44.0", "F44.1", "F44.2", "F44.3", "F44.4", "F44.5", "F44.6", "F44.6", "F45", "F45.0", "F48", "F48.0", "F50", "F50.0", "F50.2", "F51", "F51.0", "F51.1", "F51.2", "F51.3", "F51.4", "F51.5", "F52", "F52.0", "F52.1", "F52.2", "F52.3", "F52.4", "F52.5", "F52.6", "F52.7", "F53", "F53.0", "F53.1", "F54", "F55", "F59", "F60", "F60.0", "F60.1", "F60.2", "F60.3", "F60.4", "F60.5", "F60.6", "F60.7", "F60.8", "F60.9", "F61", "F62", "F63", "F63.0", "F63.1", "F63.2", "F63.3", "F64", "F64.0", "F64.1", "F64.2", "F65", "F65.0", "F65.1", "F65.2", "F65.3", "F65.4", "F65.5", "F65.6", "F65.8", "F66", "F66.0", "F66.1", "F66.2", "F66.8", "F66.9", "F68", "F68.0", "F68.1", "F68.8", "F69", "F70", "F71", "F72", "F73", "F78", "F79", "F80", "F80.0", "F80.1", "F80.2", "F80.3", "F80.8", "F80.9", "F81", "F81.0", "F81.1", "F81.2", "F81.3", "F81.8", "F81.9", "F82", "F83", "F84", "F84.0", "F84.2", "F84.4", "F84.5", "F88", "F89", "F90", "F90.0", "F90.1", "F91", "F91.0", "F91.1", "F91.2", "F91.3", "F92", "F92.0", "F93", "F93.0", "F93.1", "F93.2", "F93.3", "F94", "F94.0", "F94.1", "F94.2", "F95", "F95.0", "F95.1", "F95.2", "F98", "F98.0", "F98.1", "F98.2", "F98.3", "F98.4", "F98.5", "F98.6", "F98.8", "F98.9", "F99" ];

		autocomplete(document.getElementById("primary-dx"), dxs);

	    }

        }

);
