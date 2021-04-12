/*
*@NApiVersion 2.x
*@NScriptType ClientScript
*/
define(['N/file', 'N/query','N/action', 'N/ui/serverWidget','N/form'], function(file,query,action,serverWidget,form){
    function onPageInit(context) {
        context.Form.addPageInitMessage({
            message: "Test for page init"
        });
    };
    return {
        onPageInit:onPageInit
    }
});