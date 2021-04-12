/**
 * Scripts for managing the finished goods production custom record.
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Mar 2014     nathanah
 *
 */

/**
 * Disable the attach button before load.
 * @appliedtorecord customrecordhtfinishedgoodsproduction
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
 function HT_FinishedGoodsProduction_BeforeLoad(type, form, request)
 {
     // disable the attach button
     if (form != null)
     {	
         var sublist = form.getSubList('recmachcustrecordhtfingoodsprodln_fingoodsprod');
         DisableButton(form, sublist, 'attach');	
         DisableButton(form, sublist, 'newrecrecmachcustrecordhtfingoodsprodln_fingoodsprod');	
         
         var newRec = nlapiCreateRecord('customrecordhtfinishedgoodsprodline'); 
         var btnName = 'newrec' + newRec.getFieldValue('rectype');
         DisableButton(form, sublist, btnName);
         
         sublist = form.getSubList('custom31');
         DisableButton(form, sublist, 'attach');	
     }
 }
 
 /**
  * Delete any child line records if we are deleting this main record.
  * @appliedtorecord recordType
  * 
  * @param {String} type Operation types: create, edit, delete, xedit
  *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
  *                      pack, ship (IF)
  *                      markcomplete (Call, Task)
  *                      reassign (Case)
  *                      editforecast (Opp, Estimate)
  * @returns {Void}
  */
 function HT_FinishedGoodsProduction_BeforeSubmit(type)
 {
     if (type == 'delete')
     {
         // if we are in delete mode, load the record, remove the lines, and then proceed with the delete
         var record = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId(), {recordmode: 'dynamic'});
         
         var lineCount = record.getLineItemCount('recmachcustrecordhtfingoodsprodln_fingoodsprod');
         
         for (var i=lineCount; i>0; i--)
         {
             record.removeLineItem('recmachcustrecordhtfingoodsprodln_fingoodsprod', i);
         }
         
         nlapiSubmitRecord(record);
     }
 }
 
 /**
  * Update the totals on the line as fields change.
  * @appliedtorecord customrecordhtfinishedgoodsproduction
  * 
  * @param {String} type Sublist internal id
  * @param {String} name Field internal id
  * @param {Number} linenum Optional line item number, starts from 1
  * @returns {Void}
  */
 function HT_FinishedGoodsProduction_FieldChanged(type, name, linenum)
 {
     if (	name == 'custrecordhtfingoodsprodln_additiontanks' ||
             name == 'custrecordhtfingoodsprodln_fullskidsqty' ||
             name == 'custrecordhtfingoodsprodln_fullskids' ||
             name == 'custrecordhtfingoodsprodln_partskidsqty' ||
             name == 'custrecordhtfingoodsprodln_partialskids')
     {
         var additionalTanks = ConvertNSFieldToInt(nlapiGetCurrentLineItemValue(type, 'custrecordhtfingoodsprodln_additiontanks'));
         var fullSkidsNumOfSkids = ConvertNSFieldToInt(nlapiGetCurrentLineItemValue(type, 'custrecordhtfingoodsprodln_fullskidsqty'));
         var fullSkidsNumOfTanks = ConvertNSFieldToInt(nlapiGetCurrentLineItemValue(type, 'custrecordhtfingoodsprodln_fullskids'));
         var partSkidsNumOfSkids = ConvertNSFieldToInt(nlapiGetCurrentLineItemValue(type, 'custrecordhtfingoodsprodln_partskidsqty'));
         var partSkidsNumOfTanks = ConvertNSFieldToInt(nlapiGetCurrentLineItemValue(type, 'custrecordhtfingoodsprodln_partialskids'));
         
         var totalTanks = additionalTanks + (fullSkidsNumOfSkids * fullSkidsNumOfTanks) + (partSkidsNumOfSkids * partSkidsNumOfTanks);
         nlapiSetCurrentLineItemValue(type, 'custrecordhtfingoodsprodln_totaltanks', totalTanks, false, true);
     }
 }
 
 /**
  * Workflow action that navigates to the finished goods production build suitelet.
  * @returns {Void} Any or no return value
  */
 function HT_NavigateToBuildSuiteletAction() 
 {
     var params = new Array();
     params['custparam_fingoodprod'] = nlapiGetRecordId();
     
     nlapiSetRedirectURL('SUITELET', 'customscriptht_fingoodsprodbuild_suitelt', 'customdeployht_fingoodsprodbuild_suitelt', null, params);
 }
 
 /**
  * Suitelet used to build the finished goods production records and tie them to work orders.
  * 
  * @param {nlobjRequest} request Request object
  * @param {nlobjResponse} response Response object
  * @returns {Void} Any output is written via response object
  */
 function HT_FinishedGoodsProduction_BuildSuitelet(request, response)
 {
     if (request.getMethod() == 'GET')
     {
         var finGoodProdId = request.getParameter('custparam_fingoodprod');
         if (finGoodProdId != null)
         {
             // make sure that the record isn't already built
             var statusId = nlapiLookupField('customrecordhtfinishedgoodsproduction', finGoodProdId, 'custrecordhtfinishedgoodsprod_status', false);
             if (statusId == HT_FINISHEDGOODSPRODSTATUS_BUILT)
             {
                 
                 throw nlapiCreateError('RECORD_BUILT', 'This finished goods production record has already been built.', true);
             }
             
             // Check and see if there are any other finished goods production records "Creating Builds."
             CheckIfRecordsAreBuilding(finGoodProdId);
             
             var form = nlapiCreateForm('Build Finished Goods Production', false);
             var woTab = form.addTab('custpage_workorderstab', 'Work Orders');
             var skidTab = form.addTab('custpage_skiditemstab', 'Skids');
             
             var finGoodProdField = form.addField('custpage_fingoodprod', 'select', 'Finished Goods Production', 'customrecordhtfinishedgoodsproduction', null);
             finGoodProdField.setDisplayType('inline');
             finGoodProdField.setDefaultValue(finGoodProdId);
             
             var helpField = form.addField('custpage_help', 'inlinehtml', '', null, null);
             helpField.setDefaultValue('Use this screen to tie the tank quantities to sales orders/work orders. If a work order is not showing it could be because the schedule is not "Scheduled" or "Verified" or because the work order is not "Released."');
             
             // load the record and loop through and group by item, customer, and total tanks
             var finGoodProdRecord = nlapiLoadRecord('customrecordhtfinishedgoodsproduction', finGoodProdId, null);
             var lineCount = finGoodProdRecord.getLineItemCount('recmachcustrecordhtfingoodsprodln_fingoodsprod');
             
             // store the production dates in this array
             // we will call individual searches for each of the dates
             var productionDatesArray = new Array();
             
             var finishedGoodsArray = new Array();
             var skidItemsArray = new Array();
             for (var i=1; i<=lineCount; i++)
             {
                 // total up the tanks in the array by the item and customer and production date
                 var customerId = finGoodProdRecord.getLineItemValue('recmachcustrecordhtfingoodsprodln_fingoodsprod', 'custrecordhtfingoodsprodln_customer', i);
                 var itemId = finGoodProdRecord.getLineItemValue('recmachcustrecordhtfingoodsprodln_fingoodsprod', 'custrecordhtfingoodsprodln_tank', i);
                 var totalTanks = ConvertNSFieldToInt(finGoodProdRecord.getLineItemValue('recmachcustrecordhtfingoodsprodln_fingoodsprod', 'custrecordhtfingoodsprodln_totaltanks', i));
                 var productionDate = finGoodProdRecord.getLineItemValue('recmachcustrecordhtfingoodsprodln_fingoodsprod', 'custrecordhtfingoodsprodln_proddate', i);
                 
                 var fgItemObj = null;
                 for (var j=0; j<finishedGoodsArray.length; j++)
                 {
                     if (finishedGoodsArray[j].itemId == itemId && finishedGoodsArray[j].customerId == customerId && finishedGoodsArray[j].productionDate == productionDate)
                     {
                         fgItemObj = finishedGoodsArray[j];
                         fgItemObj.totalTanks += totalTanks;
                         break;
                     }
                 }
                 
                 if (fgItemObj == null)
                 {
                     fgItemObj = new Object();
                     fgItemObj.itemId = itemId;
                     fgItemObj.customerId = customerId;
                     fgItemObj.totalTanks = totalTanks;
                     fgItemObj.productionDate = productionDate;
                     finishedGoodsArray[finishedGoodsArray.length] = fgItemObj;
                     
                     var dateFound = false;
                     for (var j=0; j<productionDatesArray.length; j++)
                     {
                         if (productionDatesArray[j] == productionDate)
                         {
                             dateFound = true;
                             break;
                         }
                     }
                     
                     if (!dateFound)
                         productionDatesArray.push(productionDate);
                 }
                 
                 var skidItemId = finGoodProdRecord.getLineItemValue('recmachcustrecordhtfingoodsprodln_fingoodsprod', 'custrecordhtfingoodsprodln_skiditem', i);
                 var fullSkidsNumOfSkids = ConvertNSFieldToInt(finGoodProdRecord.getLineItemValue('recmachcustrecordhtfingoodsprodln_fingoodsprod', 'custrecordhtfingoodsprodln_fullskidsqty', i));
                 var partialSkidsNumOfSkids = ConvertNSFieldToInt(finGoodProdRecord.getLineItemValue('recmachcustrecordhtfingoodsprodln_fingoodsprod', 'custrecordhtfingoodsprodln_partskidsqty', i));
                 
                 var skidFound = false;
                 var skidObj = null;
                 for (var j=0; j<skidItemsArray.length; j++)
                 {
                     skidObj = skidItemsArray[j];
                     if (skidObj.skidItemId == skidItemId)
                     {
                         skidFound = true;
                         skidObj.quantity += fullSkidsNumOfSkids + partialSkidsNumOfSkids;
                         break;
                     }
                 }
                 
                 if (!skidFound)
                 {
                     skidObj = new Object();
                     skidObj.skidItemId = skidItemId;
                     skidObj.quantity = fullSkidsNumOfSkids + partialSkidsNumOfSkids;
                     skidItemsArray[skidItemsArray.length] = skidObj;
                 }				
             }
             
             // go out and find production schedules for this line and location for this week
             var lineId = finGoodProdRecord.getFieldValue('custrecordhtfinishedgoodsprod_prodline');
             var locationId = finGoodProdRecord.getFieldValue('custrecordhtfinishedgoodsprod_location');
             var productionDate = finGoodProdRecord.getFieldValue('custrecordhtfinishedgoodsprod_proddate');
             
             // get the different schedules based on production dates
             var scheduleResults = null;
             for (var i=0; i<productionDatesArray.length; i++)
             {
                 var scheduleFilters = new Array();
                 scheduleFilters[scheduleFilters.length] = new nlobjSearchFilter('custrecordhtprodsch_location', 'custrecordhtprodschwo_prodschedule', 'is', locationId);
                 scheduleFilters[scheduleFilters.length] = new nlobjSearchFilter('custrecordhtprodsch_status', 'custrecordhtprodschwo_prodschedule', 'anyof', [HT_PRODUCTIONSCHEDULESTATUS_SCHEDULED, HT_PRODUCTIONSCHEDULESTATUS_VERIFIED]);
                 
                 // the production date on the finished goods production record should match the start dat eof the schedule
                 scheduleFilters[scheduleFilters.length] = new nlobjSearchFilter('custrecordhtprodsch_startdate', 'custrecordhtprodschwo_prodschedule', 'on', productionDatesArray[i]);
                 
                 var scheduleResultsTemp = nlapiSearchRecord('customrecordhtproductionschedulewo', 'customsearchhtprodschwofingoodsbuildsuit', scheduleFilters, null);
                 
                 // add the results into the main array so they are all in the same list
                 if (scheduleResultsTemp != null)
                 {					
                     if (scheduleResults != null)
                         scheduleResults = scheduleResults.concat(scheduleResultsTemp);
                     else
                         scheduleResults = scheduleResultsTemp;
                 }
             }
 
             // set up the sublist
             var sublist = form.addSubList('custpage_wosublist', 'list', 'Work Orders', 'custpage_workorderstab');
             
             var field = sublist.addField('custpage_item', 'select', 'Tank', 'item');
             field.setDisplayType('inline');
             
             field = sublist.addField('custpage_productiondate', 'date', 'Production Date');
             field.setDisplayType('inline');
             
             field = sublist.addField('custpage_workorder', 'select', 'Work Order', 'workorder');
             field.setDisplayType('inline');
             
             field = sublist.addField('custpage_salesorder', 'select', 'Sales Order', 'salesorder');
             field.setDisplayType('inline');
             
             field = sublist.addField('custpage_customer', 'select', 'Customer', 'customer');
             field.setDisplayType('inline');
             
             field = sublist.addField('custpage_makeqty', 'float', 'Total Make Quantity');
             field.setDisplayType('inline');
             
             field = sublist.addField('custpage_qtybuilt', 'float', 'Quantity Built');
             field.setDisplayType('inline');
             
             field = sublist.addField('custpage_qtyremaining', 'float', 'Quantity Remaining To Build');
             field.setDisplayType('inline');
             
             field = sublist.addField('custpage_qtytobuild', 'float', 'Quantity To Build');
             field.setDisplayType('entry');
             
             // add the work orders to another array
             var workOrdersArray = new Array();
             
             if (scheduleResults != null)
             {				
                 for (var i=0; i<scheduleResults.length; i++)
                 {					
                     var itemFoundInFinGoodArray = false;
                     
                     // only add the items if they are part of the finished goods record and the production dates match
                     for (var j=0; j<finishedGoodsArray.length; j++)
                     {						
                         if (	scheduleResults[i].getValue('custrecordhtprodschwo_item') == finishedGoodsArray[j].itemId && 
                                 scheduleResults[i].getValue('custrecordhtprodsch_startdate', 'custrecordhtprodschwo_prodschedule') == finishedGoodsArray[j].productionDate)
                         {
                             itemFoundInFinGoodArray = true;
                             break;
                         }
                     }
                     
                     if (itemFoundInFinGoodArray)
                     {
                         var obj = new Object();
                         obj.itemId = scheduleResults[i].getValue('custrecordhtprodschwo_item');
                         obj.workOrderId = scheduleResults[i].getValue('custrecordhtprodschwo_workorder');
                         obj.salesOrderId = scheduleResults[i].getValue('custrecordhtprodschwo_salesorder');
                         obj.customerId = scheduleResults[i].getValue('entity', 'custrecordhtprodschwo_salesorder');
                         obj.productionDate = scheduleResults[i].getValue('custrecordhtprodsch_startdate', 'custrecordhtprodschwo_prodschedule');
                         obj.qtyBuilt = ConvertNSFieldToInt(scheduleResults[i].getValue('quantityshiprecv', 'custrecordhtprodschwo_workorder'));
                         obj.qtyTotal = ConvertNSFieldToInt(scheduleResults[i].getValue('quantity', 'custrecordhtprodschwo_workorder'));
                         obj.originalQtyRemaining = obj.qtyTotal - obj.qtyBuilt;
                         obj.qtyRemaining = obj.qtyTotal - obj.qtyBuilt;
                         obj.qtyToBuild = 0;
                         
                         workOrdersArray[workOrdersArray.length] = obj;
                     }
                 }
             }
             
             // now loop through all the finished goods totals and assign those totals to a work order
             // the remaining quantities get assigned to a "stock" line, which is an item without a customer or work order
             for (var i=0; i<finishedGoodsArray.length; i++)
             {
                 var remainingQty = finishedGoodsArray[i].totalTanks;
                 
                 for (var j=0; j<workOrdersArray.length; j++)
                 {
                     if (	finishedGoodsArray[i].itemId == workOrdersArray[j].itemId && 
                             finishedGoodsArray[i].customerId == workOrdersArray[j].customerId && 
                             finishedGoodsArray[i].productionDate == workOrdersArray[j].productionDate &&
                             workOrdersArray[j].qtyRemaining > 0)
                     {
                         // we found a work order for this item and customer with a quantity remaining
                         // is the remaining quantity to build greater than or equal to the qty remaining on the work order?
                         //		if so, then we can assign all of the remaining quantity of the build to this work order and update the remaining quantity with the remainder
                         if (remainingQty >= workOrdersArray[j].qtyRemaining)
                         {
                             workOrdersArray[j].qtyToBuild += workOrdersArray[j].qtyRemaining;
                             remainingQty -= workOrdersArray[j].qtyRemaining;
                             workOrdersArray[j].qtyRemaining = 0;
                         }
                         else // remainingQty < workOrdersArray[j].qtyRemaining
                         {
                             // remaining quantity is less than the quantity remaining
                             // assign all of the remaining quantity from the finished goods record and update the remainder on the work order
                             workOrdersArray[j].qtyToBuild += remainingQty;
                             workOrdersArray[j].qtyRemaining = workOrdersArray[j].qtyRemaining - remainingQty;
                             remainingQty = 0;
                             
                             // break out because there isn't anything left
                             break;
                         }
                     }
                 }
                 
                 // is there any remaining quantity left? if so, then add it to the "stock" line for this item
                 if (remainingQty > 0)
                 {
                     // see if there is a line the the work orders array that is a blank customer line for this item
                     var obj = null;
                     for (var j=0; j<workOrdersArray.length; j++)
                     {
                         if (workOrdersArray[j].itemId == finishedGoodsArray[i].itemId && workOrdersArray[j].customerId == null && workOrdersArray[j].productionDate == finishedGoodsArray[i].productionDate)
                         {
                             obj = workOrdersArray[j];
                             obj.qtyToBuild += remainingQty;
                             break;
                         }
                     }
                     
                     if (obj == null)
                     {
                         var obj = new Object();
                         obj.itemId = finishedGoodsArray[i].itemId;
                         obj.workOrderId = null;
                         obj.salesOrderId = null;
                         obj.customerId = null;
                         obj.qtyBuilt = 0;
                         obj.qtyTotal = 0;
                         obj.qtyRemaining = 0;
                         obj.originalQtyRemaining = 0;
                         obj.qtyToBuild = remainingQty;
                         obj.productionDate = finishedGoodsArray[i].productionDate;
                         
                         workOrdersArray[workOrdersArray.length] = obj;
                     }
                 }
             }
             
             // finally, loop through all the work orders and add them to the sublist
             for (var i=0; i<workOrdersArray.length; i++)
             {
                 sublist.setLineItemValue('custpage_item', i+1, workOrdersArray[i].itemId);
                 sublist.setLineItemValue('custpage_workorder', i+1, workOrdersArray[i].workOrderId);
                 sublist.setLineItemValue('custpage_salesorder', i+1, workOrdersArray[i].salesOrderId);
                 sublist.setLineItemValue('custpage_customer', i+1, workOrdersArray[i].customerId);		
                 sublist.setLineItemValue('custpage_makeqty', i+1, workOrdersArray[i].qtyTotal);
                 sublist.setLineItemValue('custpage_qtybuilt', i+1, workOrdersArray[i].qtyBuilt);	
                 sublist.setLineItemValue('custpage_qtyremaining', i+1, workOrdersArray[i].originalQtyRemaining);
                 sublist.setLineItemValue('custpage_qtytobuild', i+1, workOrdersArray[i].qtyToBuild);
                 sublist.setLineItemValue('custpage_productiondate', i+1, workOrdersArray[i].productionDate);
             }			
             
             // build and add the skid items to the sublist
             var skidItemSublist = form.addSubList('custpage_skidsublist', 'list', 'Skid Items', 'custpage_skiditemstab');
             
             field = skidItemSublist.addField('custpage_skiditem', 'select', 'Skid', 'item');
             field.setDisplayType('inline');
             
             field = skidItemSublist.addField('custpage_skidqty', 'float', 'Quantity');
             field.setDisplayType('inline');
             
             for (var i=0; i<skidItemsArray.length; i++)
             {
                 skidItemSublist.setLineItemValue('custpage_skiditem', i+1, skidItemsArray[i].skidItemId);
                 skidItemSublist.setLineItemValue('custpage_skidqty', i+1, parseInt(skidItemsArray[i].quantity));	
             }	
             
             form.addSubmitButton('Create Builds');
             
             response.writePage(form);
         }
     }
     else
     {
         var finGoodProdId = request.getParameter('custpage_fingoodprod');
         var fields = nlapiLookupField('customrecordhtfinishedgoodsproduction', finGoodProdId, ['custrecordhtfinishedgoodsprod_date', 'custrecordhtfinishedgoodsprod_location'], false);	
         
         // make sure that the finished goods record isn't already built before submitting this
         var statusId = nlapiLookupField('customrecordhtfinishedgoodsproduction', finGoodProdId, 'custrecordhtfinishedgoodsprod_status', false);
         if (statusId == HT_FINISHEDGOODSPRODSTATUS_BUILT)
         {
             throw nlapiCreateError('RECORD_BUILT', 'This finished goods production record has already been built and cannot be submitted again.', true);
         }
         
         // Check and see if there are any other finished goods production records "Creating Builds."
         CheckIfRecordsAreBuilding(finGoodProdId);
         
         // go through all the skid items and we will create an inventory adjustment to remove them from inventory		
         var submitInventoryAdjustment = false; // this flag indicates that the inventory adjustment should be submitted; if there aren't any line items, then we shouldn't submit it
         var inventoryAdjustment = nlapiCreateRecord('inventoryadjustment');
         var adjustmentAccount = nlapiGetContext().getSetting('SCRIPT', 'custscriptht_skiditeminvadjaccount');
         
         inventoryAdjustment.setFieldValue('trandate', fields.custrecordhtfinishedgoodsprod_date);
         inventoryAdjustment.setFieldValue('memo', 'Skid Item Inventory Adjustment - Finished Good Production #' + finGoodProdId);
         inventoryAdjustment.setFieldValue('adjlocation', fields.custrecordhtfinishedgoodsprod_location);
         inventoryAdjustment.setFieldValue('account', adjustmentAccount);
         inventoryAdjustment.setFieldValue('custbodyhtfinishedgoodsproduction', finGoodProdId);
         
         var lineIndex = 1;
         var skidLineCount = request.getLineItemCount('custpage_skidsublist');
         for (var i=1; i<=skidLineCount; i++)
         {
             var skidItemId = request.getLineItemValue('custpage_skidsublist', 'custpage_skiditem', i);
             
             if (skidItemId != '' && skidItemId != null)
             {
                 var skidQty = parseInt(request.getLineItemValue('custpage_skidsublist', 'custpage_skidqty', i));
                 
                 // check and see if the skid item is a kit
                 // if it is a kit, then relieve the components
                 var skidResults = nlapiSearchRecord('item', null, new nlobjSearchFilter('internalid', null, 'is', skidItemId), null);
                 if (skidResults != null && skidResults.length > 0)
                 {
                     var skidRecordType = skidResults[0].getRecordType();
                     
                     if (skidRecordType == 'kititem')
                     {
                         var skidItem = nlapiLoadRecord('kititem', skidItemId, null);
                         var skidComponentsCount = skidItem.getLineItemCount('member');
                         for (var j=1; j<=skidComponentsCount; j++)
                         {
                             var memberQty = ConvertNSFieldToFloat(skidItem.getLineItemValue('member', 'quantity', j));
                             var memberId = skidItem.getLineItemValue('member', 'item', j);
                             
                             inventoryAdjustment.setLineItemValue('inventory', 'item', lineIndex, memberId);
                             inventoryAdjustment.setLineItemValue('inventory', 'adjustqtyby', lineIndex, (skidQty * memberQty) * -1);
                             inventoryAdjustment.setLineItemValue('inventory', 'location', lineIndex, fields.custrecordhtfinishedgoodsprod_location);
                             
                             submitInventoryAdjustment = true;
                             lineIndex++;
                         }
                     }
                     else if (skidRecordType == 'inventoryitem')
                     {
                         inventoryAdjustment.setLineItemValue('inventory', 'item', lineIndex, skidItemId);
                         inventoryAdjustment.setLineItemValue('inventory', 'adjustqtyby', lineIndex, skidQty * -1);
                         inventoryAdjustment.setLineItemValue('inventory', 'location', lineIndex, fields.custrecordhtfinishedgoodsprod_location);
                         
                         submitInventoryAdjustment = true;
                         lineIndex++;
                     }
                 }
             }
         }
         
         if (submitInventoryAdjustment)
         {
             nlapiSubmitRecord(inventoryAdjustment, true);
         }
         
         // get the lines and pass that data through to a scheduled script
         // update the finished good record to be "built"
         var params = new Array();
         params['custscripthtbuildfingoodprod_fingoodprod'] = finGoodProdId;
         
         var jsonArray = new Array();
         var lineCount = request.getLineItemCount('custpage_wosublist');
         for (var i=1; i<=lineCount; i++)
         {
             var obj = new Object();
             obj.workOrderId = request.getLineItemValue('custpage_wosublist', 'custpage_workorder', i);
             obj.itemId = request.getLineItemValue('custpage_wosublist', 'custpage_item', i);
             obj.qtyToBuild = ConvertNSFieldToFloat(request.getLineItemValue('custpage_wosublist', 'custpage_qtytobuild', i));
             obj.productionDate = request.getLineItemValue('custpage_wosublist', 'custpage_productiondate', i);
             
             // only include those with a quantity to build that isn't 0
             if (obj.qtyToBuild != 0)
             {
                 jsonArray[jsonArray.length] = obj;
             }
         }
         var transferItems = jsonArray;

         params['custscripthtbuildfingoodprod_buildjson'] = JSON.stringify(jsonArray);
         
         // update the finished good record to be creating builds
         nlapiSubmitField('customrecordhtfinishedgoodsproduction', request.getParameter('custpage_fingoodprod'), 'custrecordhtfinishedgoodsprod_status', HT_FINISHEDGOODSPRODSTATUS_CREATINGBUILDS);
         
         ScheduleScript('customscripthtbuildfinishedgoodsprodsch', null, params);
         
         nlapiSetRedirectURL('RECORD', 'customrecordhtfinishedgoodsproduction', request.getParameter('custpage_fingoodprod'), false, null);
 
                             /*
                             TEST HERE IF THE ITEM BEING CREATED/BUILT IS FOR BLUE BIRD OR A COATING TANK
                             IF SO THEN POST AN INVENTORY TRANSFER FROM PRODUCTION TO EITHER QUARANTINE (BLUE BIRD)
                             OR OUTSIDE PROCESS (COATING) MF 4/8/2021
                             */
                             var inventoryTransfer = nlapiCreateRecord('inventorytransfer', {recordmode: 'dynamic'});
                             var transferLineIndex = 1
                             var submitTransfer = false
                             //var adjustmentAccount = nlapiGetContext().getSetting('SCRIPT', 'custscriptht_skiditeminvadjaccount');
                             var blueBirdItems = ["1-HT10501","1-HT10502","1-HT10503","1-HT10504","1-HT10505",13736]
                             var coatingItems = ["1-HT1200C","1-HT12116C","1-HT1600","1-HT1601","1-HT1602","1-HT1604A","1-HT1604CA","1-HT1609","1-HT1621",
                             "1-HT1629","1-HT2001","1-HT2008","1-HT2009","1-HT2011","1-HT2017","1-HT2021A","1-HT2024","1-HT2026","1-HT2027","1-HT2028","1-HT2035",
                             "1-HT2036","1-HT2037P","1-HT2038","1-HT60149C"]
                             //Start IF statement here
                             for( j=0;j<=transferItems.length;j++)
                             {
                                 if(blueBirdItems.indexOf(transferItems[j])>0)
                                 {
                                     inventoryTransferItems.selectNewLineItem()
                                     //set lines here
                                     inventoryTransfer.setLineItemValue('inventory','item',transferLineIndex,transferItems[j].itemId)
                                     inventoryTransfer.setLineItemValue('inventory','adjustqtyby',transferLineIndex,transferItems[j].qtyToBuild)
                                     inventoryTransfer.setLineItemValue('inventory','serialnumbers',transferLineIndex,transferItems[j].productionDate)
                                     nlapiCommitLineItem('inventory')
                                     submitTransfer = true
                                     transferLineIndex++
                                 }
                             }
                             if (submitTransfer != false)
                             {
                                 //set inventory transfer header values
                                 inventoryTransfer.setFieldValue('trandate', transferItems[0].productionDate);
                                 inventoryTransfer.setFieldValue('location', 1)
                                 inventoryTransfer.setFieldValue('transferlocation', 2)
                                 inventoryTransfer.setFieldValue('memo', "Auto transfered to Quarantine")
 
                                 nlapiSubmitRecord(inventoryTransfer, true, false);
 
                             }
                             //RESET VARIABLES HERE
                             inventoryTransfer = nlapiCreateRecord('inventorytransfer', {recordmode: 'dynamic'});
                             submitTransfer = false;
                             transferLineIndex = 1;
                             for( j=0;j<=transferItems.length;j++)
                             {
                                 if(coatingItems.indexOf(transferItems[j])>0)
                                 {
                                     inventoryTransferItems.selectNewLineItem()
                                     //set lines here
                                     inventoryTransfer.setLineItemValue('inventory','item',transferLineIndex,transferItems[j].itemId)
                                     inventoryTransfer.setLineItemValue('inventory','adjustqtyby',transferLineIndex,transferItems[j].qtyToBuild)
                                     inventoryTransfer.setLineItemValue('inventory','serialnumbers',transferLineIndex,transferItems[j].productionDate)
                                     nlapiCommitLineItem('inventory')
                                     submitTransfer = true
                                     transferLineIndex++
                                 }
                             }
                             if (submitTransfer != false)
                             {
                                 //set inventory transfer header values
                                 inventoryTransfer.setFieldValue('trandate', transferItems[0].productionDate);
                                 inventoryTransfer.setFieldValue('location', 1)
                                 inventoryTransfer.setFieldValue('transferlocation', 5)
                                 inventoryTransfer.setFieldValue('memo', "Auto transfered to Quarantine")
                                 nlapiSubmitRecord(inventoryTransfer, true, false);
 
                             }
                             //END
     }
 }
 
 /**
  * Scheduled script that creates builds for the work orders and quantities passed in from the finished goods production record.
  * 
  * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
  * @returns {Void}
  */
 function HT_BuildFinishedGoodsProductionScheduled(type) 
 {
     var context = nlapiGetContext();
     var finGoodProdId = context.getSetting('SCRIPT', 'custscripthtbuildfingoodprod_fingoodprod');
     var jsonBuild = context.getSetting('SCRIPT', 'custscripthtbuildfingoodprod_buildjson');
     
     var buildArray = JSON.parse(jsonBuild);
     
     try
     {
         // Check and see if there are any other finished goods production records "Creating Builds."
         CheckIfRecordsAreBuilding(finGoodProdId);
         
         var fields = nlapiLookupField('customrecordhtfinishedgoodsproduction', finGoodProdId, ['custrecordhtfinishedgoodsprod_date', 'custrecordhtfinishedgoodsprod_location'], false);
         
         for (var i=0; i<buildArray.length; i++)
         {
             var workOrderId = buildArray[i].workOrderId;
             var itemId = buildArray[i].itemId;
             var qtyToBuild = buildArray[i].qtyToBuild;
             
             // the production date now comes from the array because the FG Production reports can go across production dates
             var productionDate = nlapiStringToDate(buildArray[i].productionDate);
             
             if (workOrderId != null)
             {
                 var saveCounter = 0;
                 var MAX_TRIES = 5;
                 
                 while (saveCounter < MAX_TRIES)
                 {
                     try
                     {
                         // work order isn't null so transform the record
                         var workOrder = nlapiLoadRecord('workorder', workOrderId, null);
                         var statusId = workOrder.getFieldValue('statusRef');
                         
                         if (statusId != NETSUITE_WORKORDER_STATUS_FULLYBUILT)
                         {
                             // transform the work order into an assembly build record, set the quantity to 1 and submit
                             var build = nlapiTransformRecord('workorder', workOrderId, 'assemblybuild', {
                                 recordmode: 'dynamic'
                             });
                             
                             build.setFieldValue('custbodyhtfinishedgoodsproduction', finGoodProdId);
                             build.setFieldValue('trandate', fields.custrecordhtfinishedgoodsprod_date);
                             build.setFieldValue('quantity', qtyToBuild);
                             build.setFieldValue('serialnumbers', FormatLotNumberDate(productionDate));
                             
                             nlapiSubmitRecord(build, true, false);
 
 
                         }
                         else
                         {
                             nlapiLogExecution('ERROR', 'Build is fully built.', 'Work Order #' + workOrder.getFieldValue('tranid') + ' has a status that is not fullyBuilt.' + ' JSON: ' + jsonBuild);
                             
                             // there's an error so set the status to error
                             nlapiSubmitField('customrecordhtfinishedgoodsproduction', finGoodProdId, 'custrecordhtfinishedgoodsprod_status', HT_FINISHEDGOODSPRODSTATUS_ERROR);
                             
                             throw nlapiCreateError('BUILDSTATUS', 'Work Order #' + workOrder.getFieldValue('tranid') + ' has a status that is not fullyBuilt.', true);
                         }
                         
                         saveCounter = MAX_TRIES;
                     }
                     catch (ex)
                     {	
                         if (ex instanceof nlobjError && ex.getCode() == 'UNEXPECTED_ERROR')
                         {
                             saveCounter++;
                             
                             nlapiLogExecution('ERROR', 'workOrderId: ' + workOrderId + ' failed. Retrying (' + saveCounter + ')', '');
                         }
                         else
                         {
                             saveCounter = MAX_TRIES;
                             
                             nlapiLogExecution('ERROR', 'workOrderId: ' + workOrderId + ' error', 'Finished Good Production ID: ' + finGoodProdId + '; Build Array: ' + JSON.stringify(buildArray));
                             
                             // there's an error so set the status to error
                             nlapiSubmitField('customrecordhtfinishedgoodsproduction', finGoodProdId, 'custrecordhtfinishedgoodsprod_status', HT_FINISHEDGOODSPRODSTATUS_ERROR);
                             
                             throw ex;
                         }
                     }
                 }
             }
             else
             {
                 try
                 {
                     // no work order so just create a stand-alone assembly build
                     var build = nlapiCreateRecord('assemblybuild', {
                         recordmode: 'dynamic'
                     });
                     
                     build.setFieldValue('location', fields.custrecordhtfinishedgoodsprod_location);
                     build.setFieldValue('custbodyhtfinishedgoodsproduction', finGoodProdId);
                     build.setFieldValue('trandate', fields.custrecordhtfinishedgoodsprod_date);
                     build.setFieldValue('item', itemId);
                     build.setFieldValue('quantity', qtyToBuild);
                     build.setFieldValue('custbodyhtworkorderttype', HT_WORKORDERTYPE_PRODUCTION);
                     build.setFieldValue('serialnumbers', FormatLotNumberDate(productionDate));
                     
                     nlapiSubmitRecord(build, true, false);
                 }
                 catch (ex)
                 {
                     nlapiLogExecution('ERROR', 'itemId: ' + itemId + ' error', 'Finished Good Production ID: ' + finGoodProdId + '; Build Array: ' + JSON.stringify(buildArray));
                     
                     // there's an error so set the status to error
                     nlapiSubmitField('customrecordhtfinishedgoodsproduction', finGoodProdId, 'custrecordhtfinishedgoodsprod_status', HT_FINISHEDGOODSPRODSTATUS_ERROR);
                     
                     throw ex;
                 }
             }
             
             if (context.getRemainingUsage() < 50)
             {
                 nlapiYieldScript();
             }
         }
     }
     catch (e)
     {
         nlapiLogExecution('ERROR', 'Finished Good Production Overall Error', 'Finished Good Production ID: ' + finGoodProdId + '; jsonBuild: ' + jsonBuild);
         
         // there's an error so set the status to error
         nlapiSubmitField('customrecordhtfinishedgoodsproduction', finGoodProdId, 'custrecordhtfinishedgoodsprod_status', HT_FINISHEDGOODSPRODSTATUS_ERROR);
         
         throw e;
     }
     
     // set the status of the record to be built
     nlapiSubmitField('customrecordhtfinishedgoodsproduction', finGoodProdId, 'custrecordhtfinishedgoodsprod_status', HT_FINISHEDGOODSPRODSTATUS_BUILT);
 }
 
 /**
  * Function that converts a date to the text of a lot number.
  * @param date
  */
 function FormatLotNumberDate(date)
 {
     return padding_left(date.getMonth() + 1, '0', 2).toString() + padding_left(date.getDate(), '0', 2).toString() + date.getFullYear().toString().substring(2).toString();
 }
 
 /**
  * Workflow action that kicks off a scheduled script to unbuild a finished goods production transaction.
  * @returns {Void} Any or no return value
  */
 function HT_UnbuildFinishedGoodsProductionAction() 
 {
     var params = new Array();
     params['custscripthtunbuildfingoodprod_fingdprod'] = nlapiGetRecordId();
     
     ScheduleScript('customscripthtunbuildfinishedgoodsprdsch', null, params);
 }
 
 /**
  * Scheduled script that deletes builds associated with the finished goods production record and also flips the record back to "Verified."
  * This is for situations where they need to modify the record and "update" the builds. Because builds aren't tied directly to 
  * lines, it is necessary to completely delete the builds and re-reconcile the data to work orders again.
  * 
  * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
  * @returns {Void}
  */
 function HT_UnBuildFinishedGoodsProductionSchedul(type) 
 {
     var context = nlapiGetContext();
     var finGoodProdId = context.getSetting('SCRIPT', 'custscripthtunbuildfingoodprod_fingdprod');
     
     // first, make sure that the status of the finished goods production record is built
     // it could also have an error and we want to delete the builds and try again
     var statusId = nlapiLookupField('customrecordhtfinishedgoodsproduction', finGoodProdId, 'custrecordhtfinishedgoodsprod_status', false);
     
     if (statusId == HT_FINISHEDGOODSPRODSTATUS_BUILT || statusId == HT_FINISHEDGOODSPRODSTATUS_ERROR)
     {
         nlapiSubmitField('customrecordhtfinishedgoodsproduction', finGoodProdId, 'custrecordhtfinishedgoodsprod_status', HT_FINISHEDGOODSPRODSTATUS_DELETINGBUILDS);
         
         try
         {
             // get any assembly builds (and skid item inventory adjustment) associated with this finished goods production record
             var buildFilters = new Array();
             buildFilters[buildFilters.length] = new nlobjSearchFilter('mainline', null, 'is', 'T');
             buildFilters[buildFilters.length] = new nlobjSearchFilter('custbodyhtfinishedgoodsproduction', null, 'is', finGoodProdId);
             
             var buildResults = nlapiSearchRecord('transaction', null, buildFilters, null);
             
             if (buildResults != null)
             {
                 for (var i=0; i<buildResults.length; i++)
                 {
                     nlapiDeleteRecord(buildResults[i].getRecordType(), buildResults[i].getId());
                     
                     if (context.getRemainingUsage() < 50)
                     {
                         nlapiYieldScript();
                     }
                 }
             }
         }
         catch (ex)
         {
             nlapiLogExecution('ERROR', 'Finished Good Production Delete Builds Error', 'Finished Good Production ID: ' + finGoodProdId);
             
             // there's an error so set the status to error
             nlapiSubmitField('customrecordhtfinishedgoodsproduction', finGoodProdId, 'custrecordhtfinishedgoodsprod_status', HT_FINISHEDGOODSPRODSTATUS_ERROR);
             
             throw e;
         }
         
         // set the status back to "Verified"
         nlapiSubmitField('customrecordhtfinishedgoodsproduction', finGoodProdId, 'custrecordhtfinishedgoodsprod_status', HT_FINISHEDGOODSPRODSTATUS_VERIFIED);
     }
 }
 
 /**
  * Suitelet form that is used to batch print the FG Production records.
  * The combines multipl FG production printouts into one grouped by lot date.
  * @param {nlobjRequest} request Request object
  * @param {nlobjResponse} response Response object
  * @returns {Void} Any output is written via response object
  */
 function HT_BatchPrintFGProductionForm_Suitelet(request, response)
 {
     if (request.getMethod() == 'GET')
     {
         var form = nlapiCreateForm('Batch Print Finished Goods Production', false);
         form.setScript('customscriptht_printbatchfgprod_client');
         
         var dateField = form.addField('custpage_date', 'date', 'Date', null, null);
         dateField.setMandatory(true);
         
         var yesterday = new Date();
         yesterday = nlapiAddDays(yesterday, -1);
         
         dateField.setDefaultValue(nlapiDateToString(yesterday));
         
         var locationField = form.addField('custpage_location', 'select', 'Location', 'location');
         locationField.setMandatory(true);
         locationField.setDefaultValue(LOCATION_PRODUCTION);
         
         form.addButton('custpage_printbatchfgproductionreport', 'Print', 'PrintBatchFGProductionReports');
         
         response.writePage(form);
     }
 }
 
 /**
  * Client-side script for printing the FG Production report in batch.
  */
 function PrintBatchFGProductionReports()
 {
     var custpage_location = nlapiGetFieldValue('custpage_location');
     var custpage_date = nlapiGetFieldValue('custpage_date');
     
     if (custpage_location != '' && custpage_location != null && custpage_date != '' && custpage_date != null)
     {
         window.open(nlapiResolveURL('SUITELET', 'customscriptht_printbatchfgprodprintsuit', 'customdeployht_printbatchfgprodprintsuit') + 
                 '&custpage_location=' + custpage_location + '&custpage_date=' + custpage_date, '_blank');
     }	
 }
 
 /**
  * Suitelet printout logic that is used to batch print the FG Production records.
  * The combines multiple FG production printouts into one grouped by lot date.
  * This is called by the Suitelet form.
  * @param {nlobjRequest} request Request object
  * @param {nlobjResponse} response Response object
  * @returns {Void} Any output is written via response object
  */
 function HT_BatchPrintFGProductionPrint_Suitelet(request, response)
 {
     var locationId = request.getParameter('custpage_location');
     var date = request.getParameter('custpage_date');
     
     // get the finished goods production line date by location and date
     var filters = new Array();
     filters[filters.length] = new nlobjSearchFilter('custrecordhtfinishedgoodsprod_date', 'custrecordhtfingoodsprodln_fingoodsprod', 'on', date);
     filters[filters.length] = new nlobjSearchFilter('custrecordhtfinishedgoodsprod_location', 'custrecordhtfingoodsprodln_fingoodsprod', 'anyof', locationId);
     
     var cols = new Array();
     cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_fingoodsprod');
     cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_customer');
     cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_tank');
     cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_additiontanks');
     cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_fullskidsqty');
     cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_fullskids');
     cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_partskidsqty');
     cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_partialskids');
     cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_totaltanks');
     cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_prodschedule');
     cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_proddate');
     cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_skiditem');
     cols[cols.length] = new nlobjSearchColumn('custitemhttankseries', 'custrecordhtfingoodsprodln_tank');
     cols[cols.length] = new nlobjSearchColumn('created');
     
     var results = nlapiSearchRecord('customrecordhtfinishedgoodsprodline', null, filters, cols);
     
     var html = 
         '<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">' + 
             '<pdfset>';
     
     if (results != null && results.length > 0)
     {
         results = results.sort(SortFGProductionRecords);
         
         // loop through the results first and set a total by model
         // this is a 2 dimensional array to store totals by lot date and then model
         // this takes the place of showing the total by the last model on the page
         // this no longer works because we are sorting by date created and not model
         // 11/23/15 NAH		
         var modelTotalsArray = new Array();
         for (var i=0; i<results.length; i++)
         {
             var tankId = results[i].getValue('custrecordhtfingoodsprodln_tank');
             var totalTanks = ConvertNSFieldToInt(results[i].getValue('custrecordhtfingoodsprodln_totaltanks'));
             var lotDate = results[i].getValue('custrecordhtfingoodsprodln_proddate');
             
             if (modelTotalsArray[lotDate] == null)
             {
                 modelTotalsArray[lotDate] = new Array();
                 modelTotalsArray[lotDate][tankId] = totalTanks;
             }
             else
             {
                 if (modelTotalsArray[lotDate][tankId] == null)
                 {
                     modelTotalsArray[lotDate][tankId] = totalTanks;
                 }
                 else
                 {
                     modelTotalsArray[lotDate][tankId] += totalTanks;
                 }
             }
                 
         }
         
         var previousLotDate = ''; // store the previous lot date because were doing page breaks for each lot
         var tankModelTotal = 0;
         
         for (var i=0; i<results.length; i++)
         {
             var lotDate = results[i].getValue('custrecordhtfingoodsprodln_proddate');
             
             if (previousLotDate != lotDate || i % 32 == 0) //need to repeat header every 32 rows. See Case #5707. - JLS
             {
                 tankModelTotal = 0;
                 
                 // if we are at the beginning, then we don't need to close the PDF tab
                 if (i != 0)
                 {
                     html += 
                                 '</table>' +
                             '</body>' + 
                         '</pdf>';
                 }
                 
                 html += 
                     '<pdf>' + 
                         '<body style="font-size:8pt; font-family: Verdana, Geneva, sans-serif; margin:0pt 0pt 0pt 0pt;" size="letter-landscape">' + 
                             '<h1 align="center" padding-bottom="10px">' +
                                 'Finished Goods Report' +
                             '</h1>' +
                             '<h4 align="center" padding-bottom="10px">' +
                                 'Date: ' + date + '&nbsp; &nbsp; &nbsp; &nbsp; Lot Date: ' + lotDate +
                             '</h4>' +
                             '<table width="100%" cellpadding="2">' + 
                                 '<tr border-bottom="solid">' +
                                     '<th><b>Customer</b></th>' +
                                     '<th><b>Tank Model</b></th>' +
                                     '<th><b>Additional Tanks</b></th>' +
                                     '<th><b>Full Skids</b></th>' +
                                     '<th><b>Partial Skids</b></th>' +
                                     '<th><b>Total Tanks</b></th>' +
                                     '<th><b>Tank Model Total</b></th>' +
                                     '<th><b>FG Production #</b></th>' +
                                     '<th><b>Date Created</b></th>' +
                                 '</tr>';
             }
             
             var fgProductionNum = results[i].getValue('custrecordhtfingoodsprodln_fingoodsprod');
             var series = nlapiEscapeXML(results[i].getText('custitemhttankseries', 'custrecordhtfingoodsprodln_tank'));
             var customer = nlapiEscapeXML(results[i].getText('custrecordhtfingoodsprodln_customer'));
             var tank = nlapiEscapeXML(results[i].getText('custrecordhtfingoodsprodln_tank'));
             var tankId = results[i].getValue('custrecordhtfingoodsprodln_tank')
             var additionalTanks = results[i].getValue('custrecordhtfingoodsprodln_additiontanks');
             var fullSkids = results[i].getValue('custrecordhtfingoodsprodln_fullskids');
             var fullSkidsQty = results[i].getValue('custrecordhtfingoodsprodln_fullskidsqty');
             var partialSkids = results[i].getValue('custrecordhtfingoodsprodln_partialskids');
             var partialSkidsQty = results[i].getValue('custrecordhtfingoodsprodln_partskidsqty');
             var totalTanks = ConvertNSFieldToInt(results[i].getValue('custrecordhtfingoodsprodln_totaltanks'));
             var dateCreated = results[i].getValue('created');
             
             tankModelTotal += totalTanks;
             
             var tankModelTotalString = '';
             
             // show the tank model total string if we are at the end of the loop or the tank is going to change
             if (i+1 == results.length || tank != results[i+1].getText('custrecordhtfingoodsprodln_tank'))
             {
                 tankModelTotalString = tankModelTotal;
             }
             
             html += 
                 '<tr border-bottom="solid">' +
                     '<td border-left="solid" border-right="solid">' + customer + '</td>' +
                     '<td border-right="solid">' + tank + '</td>' +
                     '<td border-right="solid" align="center">' + additionalTanks + '</td>' +
                     '<td border-right="solid" align="center">' + fullSkidsQty + ' x ' + fullSkids + '</td>' +
                     '<td border-right="solid" align="center">' + partialSkidsQty + ' x ' + partialSkids + '</td>' +
                     '<td border-right="solid" align="right">' + totalTanks + '</td>' +
                     '<td border-right="solid" align="right">' + modelTotalsArray[lotDate][tankId] + '</td>' +
                     '<td border-right="solid" align="right">' + fgProductionNum + '</td>' +
                     '<td border-right="solid" align="right">' + dateCreated + '</td>' +
                 '</tr>';
             
             previousLotDate = lotDate;
             
             // will the next line be the same tank? if not, then reset the tank model total
             // make sure we aren't at the end
             if (i+1 != results.length && tank != results[i+1].getText('custrecordhtfingoodsprodln_tank'))
             {
                 tankModelTotal = 0;
             }
         }
         
         // close out the pdf tag
         html += 
                 '</table>' +
             '</body>' + 
         '</pdf>';
     }
     else
     {
         html += 
             '<pdf>' + 
                 '<body style="font-size:9pt; font-family: Verdana, Geneva, sans-serif; margin:0pt 0pt 0pt 0pt;">' + 
                     'There are not finished goods production records that match this location and date that were selected.' +
                 '</body>' + 
             '</pdf>';
     }
     
     html += '</pdfset>';
     
     var file = nlapiXMLToPDF(html);		
     
     var fileName = 'Print Finished Good Production Reports - ' + date;
     
     response.setContentType('PDF', fileName + '.pdf');
     response.write( file.getValue() );
 }
 
 /**
  * Sort the finished goods production results by: 
  * 1) Lot Date
  * 2) Internal ID (date of when it was entered)
  * @param result1
  * @param result2
  */
 function SortFGProductionRecords(result1, result2)
 {
     var lotDate1 = result1.getValue('custrecordhtfingoodsprodln_proddate');
     var lotDate2 = result2.getValue('custrecordhtfingoodsprodln_proddate');
     
     if (lotDate1 != '' && lotDate2 != '')
     {
         lotDate1 = nlapiStringToDate(lotDate1);
         lotDate2 = nlapiStringToDate(lotDate2);
         
         var lotDateDiff = lotDate1 - lotDate2;
         
         if (lotDateDiff != 0)
         {
             return lotDateDiff;
         }
     }
     
     var dateCreated1 = result1.getValue('created');
     var dateCreated2 = result2.getValue('created');
     dateCreated1 = nlapiStringToDate(dateCreated1);
     dateCreated2 = nlapiStringToDate(dateCreated2);
     
     var dateCreatedDiff = dateCreated1 - dateCreated2;
     
     return dateCreatedDiff;
 }
 
 /***
  * Function that throws an error if there is already a finished goods production record creating builds.
  * Check and see if there are any other finished goods production records "Creating Builds."
  * If so, prevent this form from loading
  * They must build them one at a time, otherwise if the same tank is used on multiple finished goods production records, 
  * 	the same work order could get used multiple times, causing issues.
  * Exclude the FGP record being passed in because that's the one we are working on.
  */
 function CheckIfRecordsAreBuilding(finishedGoodProductionId)
 {
     // check and see if there are any other finished goods production records "Creating Builds."
     // if so, prevent this form from loading
     // they must build them one at a time, otherwise if the same tank is used on multiple finished goods production records, the same work order could get used multiple times, causing issues.
     var fgpCreatingBuildsSearch = nlapiSearchRecord("customrecordhtfinishedgoodsproduction",null,
         [
            ["custrecordhtfinishedgoodsprod_status","anyof",HT_FINISHEDGOODSPRODSTATUS_CREATINGBUILDS], "AND",
            ["internalid","noneof",finishedGoodProductionId]
         ], 
         [
            new nlobjSearchColumn("name").setSort(false), 
         ]
     );
     
     if (fgpCreatingBuildsSearch != null && fgpCreatingBuildsSearch.length > 0)
     {
         var fgpId = fgpCreatingBuildsSearch[0].getId();
         
         throw nlapiCreateError('ANOTHER_RECORD_CREATINGBUILDS', 
                 'Another Finished goods production record is being built (#' + fgpId + '). Please wait until that one is complete before building this one.', true);
     }
 }