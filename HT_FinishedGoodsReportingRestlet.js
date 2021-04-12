/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       09 Feb 2015     caseylo
 *
 */

/**
 * This RESTlet creates a search that returns a list of all the locations in the form of a JSON object
 * 
 * @param dataIn - no parameters
 * @returns {Array}
 */
function HT_GetLocations(dataIn) 
{
	var location = {};
	var locationList = new Array();
	
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	//set the sort order of the results by name in ascending order
	var colSort = new nlobjSearchColumn('name');
	colSort.setSort(false);
	var columns = new Array();
	columns[columns.length] = colSort;
	columns[columns.length] = new nlobjSearchColumn('internalid');
	
	var searchResults = nlapiSearchRecord('location', null, filters, columns);
	if(searchResults != null && searchResults.length > 0)
	{
		for(var i=0; i<searchResults.length; i++)
		{
			location = new Object();
			
			location.internalId = searchResults[i].getValue('internalid');
			location.name = searchResults[i].getValue('name');
			if(searchResults[i].getValue('internalid') == LOCATION_PRODUCTION)
			{
				location.isDefault = true;
			}
			else
			{
				location.isDefault = false;
			}
			locationList[locationList.length] = location;
		}
	}
	else//this should never happen 
	{
		nlapiLogExecution('debug', 'HT_GetLocations', 'No locations were found!');
	}
	
	return locationList;
}

/**
 * This RESTlet creates a search that returns a list of all the HT Production Schedule custom records in the form of a JSON object
 * 
 * @param dataIn - parameters (dataIn.date, dataIn.locationId)
 * @returns {Array}
 */
function HT_GetProductionSchedules(dataIn) 
{
	var scheduleArray = new Array();
	var schedule = {};
	
	var paramDate = dataIn.date;//date
	var paramLocationId = dataIn.locationId;//location
	
	if(dataIn != null && dataIn != undefined && paramDate != undefined)
	{
		var filters = new Array();
		var columns = new Array();
		
		filters[filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		filters[filters.length] = new nlobjSearchFilter('custrecordhtprodsch_startdate', null, 'on', paramDate);
		filters[filters.length] = new nlobjSearchFilter('custrecordhtprodsch_location', null, 'is', paramLocationId);
		filters[filters.length] = new nlobjSearchFilter('custrecordhtprodsch_status', null, 'is', HT_PRODUCTIONSCHEDULESTATUS_SCHEDULED);
		
		var colScheduleNumber = new nlobjSearchColumn('name');
		colScheduleNumber.setSort(false);
		columns[columns.length] = colScheduleNumber;
		
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodsch_startdate');
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodsch_series');
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodsch_tanktype');
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodsch_productionline');
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodsch_location');
		
		var searchResults = nlapiSearchRecord('customrecordhtproductionschedule', null, filters, columns);
		if(searchResults != null && searchResults.length > 0)
		{
			for(var i=0; i<searchResults.length; i++)
			{
				schedule = new Object();
				schedule.internalId = searchResults[i].getId();
				schedule.number = searchResults[i].getId();
				schedule.productionDate = searchResults[i].getValue('custrecordhtprodsch_startdate');
				schedule.tankTypeId = searchResults[i].getValue('custrecordhtprodsch_tanktype');
				schedule.tankTypeText = searchResults[i].getText('custrecordhtprodsch_tanktype');
				schedule.productionLineId = searchResults[i].getValue('custrecordhtprodsch_productionline');
				schedule.productionLineText = searchResults[i].getText('custrecordhtprodsch_productionline');
				schedule.seriesIds = searchResults[i].getValue('custrecordhtprodsch_series');
				schedule.seriesText = searchResults[i].getText('custrecordhtprodsch_series');
				schedule.locationId = searchResults[i].getValue('custrecordhtprodsch_location');
				
				scheduleArray.push(schedule);
			}
		}
	}
	
	return scheduleArray;
}

/**
 * This RESTlet creates a search that returns a list of all the HT Production Schedule Item custom records in the form of a JSON object
 * 
 * @param dataIn - parameters (dataIn.date, dataIn.series, dataIn.tankType)
 * @returns {Array}
 */
function HT_GetProductionScheduleSummary(dataIn) 
{
	var scheduleSummaryList = new Array();
	var schedule = {};
	
	//set properties of dataIn object to variables since we don't know the property names yet
	var paramProductionScheduleId = dataIn.productionScheduleId;
	
	if(dataIn != null && dataIn != undefined && paramProductionScheduleId != undefined)
	{
		var filters = new Array();
		var columns = new Array();
		
		// keep a list of the items because we will need to get the total quantity produced
		var itemsArray = new Array();
		
		var lotDate = '';
		
		filters[filters.length] = new nlobjSearchFilter('custrecordhtprodschitem_prodschedule', null, 'is', paramProductionScheduleId);
		
		// only include items that aren't going to be excluded from the end of the line app
		filters[filters.length] = new nlobjSearchFilter('custrecordseries_excludefromendoflineapp', 'custrecordhtprodschitem_series', 'is', 'F');
		
		//return data sorted by sort order.
		var colSort = new nlobjSearchColumn('custrecordhtprodschitem_sortorder');
		colSort.setSort(false);
		//var columns = new Array();
		columns[columns.length] = colSort;
		
		columns[columns.length] = new nlobjSearchColumn('internalid');//schedule id
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_prodschedule');//schedule summary id
		//columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_prodschedule');//schedule # (same thing as internal id)
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_item');//item name
		columns[columns.length] = new nlobjSearchColumn('displayname', 'custrecordhtprodschitem_item');//item description, join with item
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_head');//head
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_mainbodyport');//main body port
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_bodylength');//body length
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_bracketfoot');//bracket/foot
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_tanktype');//tank type
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_specialnotes');//special notes
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_exteriorcoating');//exterior coating
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_interiorcoating');//interior coating
		//columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_sortorder');//sort order
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_productiondate');//schedule summary id
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_series');//schedule summary id
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_quantity');//order qty
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschitem_makeqty');//make qty
		
		var searchResults = nlapiSearchRecord('customrecordhtproductionscheduleitem', null, filters, columns);
		
		if(searchResults != null && searchResults.length > 0)
		{
			for(var i=0; i<searchResults.length; i++)
			{
				schedule = new Object();
				schedule.summaryId = searchResults[i].getValue('internalid');//schedule id
				schedule.scheduleId = searchResults[i].getText('custrecordhtprodschitem_prodschedule');
				schedule.scheduleNumber = searchResults[i].getValue('custrecordhtprodschitem_prodschedule');//schedule # same as id
				schedule.itemId = searchResults[i].getValue('custrecordhtprodschitem_item');//item id
				schedule.itemName = searchResults[i].getText('custrecordhtprodschitem_item');//item name
				schedule.itemDescription = searchResults[i].getValue('displayname', 'custrecordhtprodschitem_item');//shouldnt need, prevent reduces time because no join
				schedule.head = searchResults[i].getText('custrecordhtprodschitem_head');//head
				schedule.mainBodyPort = searchResults[i].getText('custrecordhtprodschitem_mainbodyport');//main body port
				schedule.bodyLength = searchResults[i].getValue('custrecordhtprodschitem_bodylength');//body length
				schedule.bracketFoot = searchResults[i].getText('custrecordhtprodschitem_bracketfoot');//bracket/foot
				schedule.tankType = searchResults[i].getText('custrecordhtprodschitem_tanktype');//tank type (name not id)
				schedule.specialNotes = searchResults[i].getText('custrecordhtprodschitem_specialnotes');//special notes
				schedule.exteriorCoating = searchResults[i].getText('custrecordhtprodschitem_exteriorcoating');//exterior coating
				schedule.interiorCoating = searchResults[i].getText('custrecordhtprodschitem_interiorcoating');//interior coating
				schedule.sortOrder = searchResults[i].getValue('custrecordhtprodschitem_sortorder');//sort order
				schedule.date = searchResults[i].getValue('custrecordhtprodschitem_productiondate');//interior coating
				schedule.orderQty = searchResults[i].getValue('custrecordhtprodschitem_quantity');//order qty
				schedule.makeQty = searchResults[i].getValue('custrecordhtprodschitem_makeqty');//make qty
				schedule.quantityProduced = 0;
				
				// the lot date is always the same because it pulls from the parent production schedule
				lotDate = searchResults[i].getValue('custrecordhtprodschitem_productiondate');
				
				itemsArray.push(schedule.itemId);
				
				scheduleSummaryList[scheduleSummaryList.length] = schedule;
			}
		}
		
		// get the total quantity produced for the items and the lot date
		var qtyProducedResults = HT_GetQuantityProduced(itemsArray, lotDate, false);
		
		// loop through and set the quantity produced
		if (qtyProducedResults != null)
		{
			for (var i=0; i<qtyProducedResults.length; i++)
			{
				var qtyProducedItemId = qtyProducedResults[i].getValue('custrecordhtfingoodsprodln_tank', null, 'GROUP');
				var qtyProduced = ConvertNSFieldToFloat(qtyProducedResults[i].getValue('custrecordhtfingoodsprodln_totaltanks', null, 'SUM'));
				
				for (var j=0; j<scheduleSummaryList.length; j++)
				{
					if (scheduleSummaryList[j].itemId == qtyProducedItemId)
					{
						scheduleSummaryList[j].quantityProduced = qtyProduced;
					}
				}
			}
		}
	}
	
	return scheduleSummaryList;
}

/**
 * This RESTlet creates a search that returns a list of all the HT Production Schedule WO custom records in the form of a JSON object
 * 
 * @param dataIn - parameters(dataIn.itemId, dataIn.scheduleId)
 * @returns {Array}
 */
function HT_GetProductionScheduleDetail(dataIn) 
{
	nlapiLogExecution('debug', 'HT_GetProductionScheduleDetail', 'Entered RESTlet');
	var scheduleDetailList = new Array();
	var schedule = {};
	//set properties of dataIn object to variables since we dont know the property names yet
	var paramItemId = dataIn.itemId;//item id
	var paramScheduleId = dataIn.scheduleId;//schedule id
	
//	var paramItemId = '4266';
//	var paramScheduleId = '1379';
	
	if(dataIn != null && dataIn != undefined && paramItemId != undefined && paramScheduleId != undefined)
	{
		// keep a list of the items because we will need to get the total quantity produced
		var itemsArray = new Array();
		
		var lotDate = '';
		
		var filters = new Array();
		
		filters[filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		filters[filters.length] = new nlobjSearchFilter('mainline', 'custrecordhtprodschwo_salesorder', 'is', 'T');
		filters[filters.length] = new nlobjSearchFilter('custrecordhtprodschwo_item', null, 'is', paramItemId);
		filters[filters.length] = new nlobjSearchFilter('custrecordhtprodschwo_prodschedule', null, 'is', paramScheduleId);
		
		var colSort = new nlobjSearchColumn('custrecordhtprodschwo_sortorder');
		colSort.setSort(false);
		var columns = new Array();
		columns[columns.length] = colSort;
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschwo_prodschedule');//schedule id
		//not sure about field it comes from
		//columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschwo_prodschedule');//schedule detail id
		columns[columns.length] = new nlobjSearchColumn('internalid');//item id
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschwo_item');//item id
		columns[columns.length] = new nlobjSearchColumn('displayname', 'custrecordhtprodschwo_item');//item id
		columns[columns.length] = new nlobjSearchColumn('tranid', 'custrecordhtprodschwo_salesorder');//sales order #
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschwo_orderqty');//order qty
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschwo_makeqtyactual');//make qty
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschwo_customer');//customer id
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodsch_startdate', 'custrecordhtprodschwo_prodschedule');//production start date
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschwo_salesorder');//sales order #
		columns[columns.length] = new nlobjSearchColumn('custrecordhtprodschwo_sortorder');//sort order
		columns[columns.length] = new nlobjSearchColumn('shipcomplete', 'custrecordhtprodschwo_salesorder');//sort order
		
		var searchResults = nlapiSearchRecord('customrecordhtproductionschedulewo', null, filters, columns);
		
		if(searchResults != null && searchResults.length > 0)
		{
			for(var i=0; i<searchResults.length; i++)
			{
				schedule = new Object();
				schedule.internalId = searchResults[i].getValue('internalid');//schedule id
				schedule.scheduleId = searchResults[i].getValue('custrecordhtprodschwo_prodschedule');//schedule id
				//not sure about field it comes from
				//schedule.detailId = searchResults[i].getValue('custrecordhtprodschwo_prodschedule');//schedule detail id
				schedule.itemId = searchResults[i].getValue('custrecordhtprodschwo_item');//item id
				schedule.itemName = searchResults[i].getText('custrecordhtprodschwo_item');//item name
				schedule.itemDescription = searchResults[i].getValue('displayname', 'custrecordhtprodschwo_item');//item description
				schedule.salesOrderId = searchResults[i].getValue('custrecordhtprodschwo_salesorder');
				schedule.salesOrderNumber = searchResults[i].getValue('tranid', 'custrecordhtprodschwo_salesorder');//sales order
				schedule.orderQty = searchResults[i].getValue('custrecordhtprodschwo_orderqty');//order qty
				schedule.makeQty = searchResults[i].getValue('custrecordhtprodschwo_makeqtyactual');//make qty
				schedule.customerId = searchResults[i].getValue('custrecordhtprodschwo_customer');//customer id
				schedule.customerName = searchResults[i].getText('custrecordhtprodschwo_customer');//customer name
				schedule.sortNumber = searchResults[i].getValue('custrecordhtprodschitem_prodschedule');//sort number
				//schedule.salesOrderNumber = searchResults[i].getValue('custrecordhtprodschwo_salesorder');//sales order #
				schedule.sortOrder = searchResults[i].getValue('custrecordhtprodschwo_sortorder');//sort order
				schedule.productionDate = searchResults[i].getValue('custrecordhtprodsch_startdate', 'custrecordhtprodschwo_prodschedule');//production date
				schedule.quantityProduced = 0;
				
				var shipComplete = searchResults[i].getValue('shipcomplete', 'custrecordhtprodschwo_salesorder');
				schedule.shipComplete = false;
				if (shipComplete == 'T')
					schedule.shipComplete = true;
				
				itemsArray.push(schedule.itemId);
				
				// the lot date is always the same because it pulls from the parent production schedule
				lotDate = schedule.productionDate;
				
				scheduleDetailList[scheduleDetailList.length] = schedule;
			}
			
			// get the total quantity produced for the items and the lot date
			var qtyProducedResults = HT_GetQuantityProduced(itemsArray, lotDate, true);
			
			// loop through and set the quantity produced
			if (qtyProducedResults != null)
			{
				for (var i=0; i<qtyProducedResults.length; i++)
				{
					var qtyProducedItemId = qtyProducedResults[i].getValue('custrecordhtfingoodsprodln_tank', null, 'GROUP');
					var qtyProduced = ConvertNSFieldToFloat(qtyProducedResults[i].getValue('custrecordhtfingoodsprodln_totaltanks', null, 'SUM'));
					var qtyProducedCustomerId = qtyProducedResults[i].getValue('custrecordhtfingoodsprodln_customer', null, 'GROUP');
					
					for (var j=0; j<scheduleDetailList.length; j++)
					{
						if (scheduleDetailList[j].itemId == qtyProducedItemId && scheduleDetailList[j].customerId == qtyProducedCustomerId)
						{
							scheduleDetailList[j].quantityProduced = qtyProduced;
						}
					}
				}
			}
		}
	}
	
	return scheduleDetailList;
}

/**
 * Returns a search with the total quantities produced for a given lot date based on the items array being passed in.
 * Looks at the FG production records, not the builds, because things might not be built yet.
 * This will run the search by customer if the IsByCustomer flag is set.
 * @param itemsArray
 * @param lotDate
 */
function HT_GetQuantityProduced(itemsArray, lotDate, isByCustomer)
{
	if (itemsArray.length > 0)
	{
		var filters = new Array();
		filters.push(new nlobjSearchFilter('custrecordhtfingoodsprodln_proddate', null, 'on', lotDate));
		filters.push(new nlobjSearchFilter('custrecordhtfingoodsprodln_tank', null, 'anyof', itemsArray));
		
		var cols = new Array();
		cols.push(new nlobjSearchColumn('custrecordhtfingoodsprodln_tank', null, 'GROUP'));
		cols.push(new nlobjSearchColumn('custrecordhtfingoodsprodln_totaltanks', null, 'SUM'));
		
		if (isByCustomer)
		{
			cols.push(new nlobjSearchColumn('custrecordhtfingoodsprodln_customer', null, 'GROUP'));
		}
		
		var searchResults = nlapiSearchRecord('customrecordhtfinishedgoodsprodline', null, filters, cols);
		
		return searchResults;
	}
}

/**
 * This RESTlet creates a search that returns a list of all the customers in the form of a JSON object
 * 
 * @param dataIn - no parameters
 * @returns {Array}
 */
function HT_GetActiveCustomers(dataIn) 
{
	var customer = {};
	var customerList = new Array();
	
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	//set the sort order of the results by name in ascending order
	var colSort = new nlobjSearchColumn('companyname');
	colSort.setSort(false);
	var columns = new Array();
	columns[columns.length] = colSort;
	columns[columns.length] = new nlobjSearchColumn('internalid');
	columns[columns.length] = new nlobjSearchColumn('custentityht_alertforquality');
	columns[columns.length] = new nlobjSearchColumn('custentityht_alertmsgforquality');
	
	var searchResults = GetSteppedSearchResults('customer', filters, columns, null); //nlapiSearchRecord('customer', null, filters, columns);
	if(searchResults != null && searchResults.length > 0)
	{
		for(var i=0; i<searchResults.length; i++)
		{
			customer = new Object();
			customer.internalId = searchResults[i].getValue('internalid');
			customer.name = searchResults[i].getValue('companyname');
			customer.qualityMessage = searchResults[i].getValue('custentityht_alertforquality') == 'T' ? searchResults[i].getValue('custentityht_alertmsgforquality') : '';
			customerList[customerList.length] = customer;
		}
	}
	else//this should never happen 
	{
		nlapiLogExecution('debug', 'HT_GetLocations', 'No locations were found!');
	}
	
	return customerList;
}

/**
 * This RESTlet creates a search that returns a list of active items of type 'Tank' as a JSON object
 * 
 * @param dataIn - no parameters
 * @returns {Array}
 */
function HT_GetActiveTankItems(dataIn) 
{
	var tankList = new Array();
	var item = {};
	var filters = new Array();
	
	filters[filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	filters[filters.length] = new nlobjSearchFilter('custitemhtitemtype', null, 'is', HT_ITEMTYPE_TANK);//item type = tank
	filters[filters.length] = new nlobjSearchFilter('custitemhttanktype', null, 'noneof', '@NONE@');
	filters[filters.length] = new nlobjSearchFilter('custrecordseries_excludefromendoflineapp', 'custitemhttankseries', 'is', 'F');
	
	var colSort = new nlobjSearchColumn('itemid');//name
	colSort.setSort(false);
	var columns = new Array();
	columns[columns.length] = colSort;
	columns[columns.length] = new nlobjSearchColumn('internalid');//id
	columns[columns.length] = new nlobjSearchColumn('description');//description
	columns[columns.length] = new nlobjSearchColumn('custitemhttankhead');//head
	columns[columns.length] = new nlobjSearchColumn('custitemhttankmainbodyport');//main body port
	columns[columns.length] = new nlobjSearchColumn('custitemhttankbodylength');//body length
	columns[columns.length] = new nlobjSearchColumn('custitemht_tankbracketfoot');//bracket/foot
	columns[columns.length] = new nlobjSearchColumn('custitemhttankspecialnotes');//special notes
	columns[columns.length] = new nlobjSearchColumn('custitemhttankcoatingexterior');//exterior coating
	columns[columns.length] = new nlobjSearchColumn('custitemhttankcoatinginterior');//interior coating
	columns[columns.length] = new nlobjSearchColumn('custitemhttankseries');//series
	columns[columns.length] = new nlobjSearchColumn('custitemhttanktype');//tank type
	
	var searchResults = GetSteppedSearchResults('assemblyitem', filters, columns, null); //nlapiSearchRecord('assemblyitem', null, filters, columns);
	
	if(searchResults != null && searchResults.length > 0)
	{
		for(var i=0; i<searchResults.length; i++)
		{
			item = new Object();
			item.internalId = searchResults[i].getId(); //id
			item.name = searchResults[i].getValue('itemid');//name
			item.description = searchResults[i].getValue('description');//description
			item.head = searchResults[i].getText('custitemhttankhead');//head
			item.mainBodyPort = searchResults[i].getText('custitemhttankmainbodyport');//main body port
			item.bodyLength = searchResults[i].getValue('custitemhttankbodylength');//body length
			item.bracketFoot = searchResults[i].getText('custitemht_tankbracketfoot');//bracket/foot
			item.specialNotes = searchResults[i].getText('custitemhttankspecialnotes');//special notes
			item.exteriorCoating = searchResults[i].getText('custitemhttankcoatingexterior');//exterior coating
			item.interiorCoating = searchResults[i].getText('custitemhttankcoatinginterior');//interior coating
			item.seriesId = searchResults[i].getValue('custitemhttankseries');//series
			item.tankTypeId = searchResults[i].getValue('custitemhttanktype');//tank type
			
			tankList[tankList.length] = item;
		}
	}
	
	return tankList;
}

/**
 * This RESTlet creates a search that returns a list of active items of type 'Skid' as a JSON object
 * 
 * @param dataIn - no parameters
 * @returns {Array}
 */
function HT_GetActiveSkidItems(dataIn) 
{
	var skidList = new Array();
	var item = {};
	var filters = new Array();
	
	filters[filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	filters[filters.length] = new nlobjSearchFilter('custitemhtitemtype', null, 'is', HT_ITEMTYPE_SKID);//item type = skid
	
	var colSort = new nlobjSearchColumn('itemid');//name
	colSort.setSort(false);
	var columns = new Array();
	columns[columns.length] = colSort;
	columns[columns.length] = new nlobjSearchColumn('internalid');//id
	columns[columns.length] = new nlobjSearchColumn('description');//description
	
	var searchResults = nlapiSearchRecord('item', null, filters, columns);
	
	if(searchResults != null && searchResults.length > 0)
	{
		for(var i=0; i<searchResults.length; i++)
		{
			item = new Object();
			item.internalId = searchResults[i].getValue('internalid');//id
			item.name = searchResults[i].getValue('itemid') + ' - ' + searchResults[i].getValue('description');//name
			item.description = searchResults[i].getValue('description');//description
			
			skidList[skidList.length] = item;
		}
	}
	
	return skidList;
}

/**
 * Get the skid quantity by item.
 * 
 * @param dataIn - parameters(dataIn.itemId, dataIn.customerId)
 * @returns {Array}
 */
function HT_GetSkidQuantityByItem(dataIn) 
{	
	var item = HT_GetSkidQuantityData(dataIn.itemId, dataIn.customerId, dataIn.skidItemId);
	return item;
}

/**
 * Get the customer part number based on the itemId and customerId.
 * 
 * @param dataIn - parameters(dataIn.itemId, dataIn.customerId)
 * @returns {string}
 */
function HT_GetCustomerPartNumber(dataIn) 
{	
	var itemId = dataIn.itemId;
	var customerId = dataIn.customerId;
	
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custrecordhtcustomerpartnumber_customer', null, 'anyof', customerId));
	filters.push(new nlobjSearchFilter('custrecordhtcustomerpartnumber_item', null, 'anyof', itemId));
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	
	var cols = new Array();
	cols.push(new nlobjSearchColumn('name'));
	
	var results = nlapiSearchRecord('customrecordhtcustomerpartnumber', null, filters, cols);
	
	if (results != null && results.length > 0)
	{
		return results[0].getValue('name');
	}
	
	return '';
}

/**
 * Returns finished goods production lines only based on parameters being passed in.
 * 
 * @param dataIn
 */
function HT_GetFinishedGoodsProductionLines(dataIn)
{
	var finishedGoodsLines = new Array();
	
	var paramLocationId = dataIn.locationId;
	var paramProductionLineId = dataIn.productionLineId;
	var paramCustomerId = dataIn.customerId;
	var paramItemId = dataIn.itemId;
	var paramProductionDate = dataIn.productionDate;
	var paramProductionScheduleId = dataIn.productionScheduleId;
	
	var filters = new Array();
//	filters[filters.length] = new nlobjSearchFilter('custrecordhtfinishedgoodsprod_status', null, 'is', HT_FINISHEDGOODSPRODSTATUS_OPEN);//status is open
	filters[filters.length] = new nlobjSearchFilter('custrecordhtfinishedgoodsprod_location', null, 'is', paramLocationId);
	filters[filters.length] = new nlobjSearchFilter('custrecordhtfingoodsprodln_proddate', 'custrecordhtfingoodsprodln_fingoodsprod', 'on', paramProductionDate);
	
	if (paramCustomerId != '')
		filters[filters.length] = new nlobjSearchFilter('custrecordhtfingoodsprodln_customer', 'custrecordhtfingoodsprodln_fingoodsprod', 'anyof', paramCustomerId);
	
	if (paramItemId != '')
		filters[filters.length] = new nlobjSearchFilter('custrecordhtfingoodsprodln_tank', 'custrecordhtfingoodsprodln_fingoodsprod', 'anyof', paramItemId);
	
	var columns = new Array();
	
	//data for header
	columns[columns.length] = new nlobjSearchColumn('internalid');//id
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_date');//date
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_location');//location
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_prodline');//production line
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_shift');//shift
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_status');//shift
	
	//data for lines
	columns[columns.length] = new nlobjSearchColumn('internalid', 'custrecordhtfingoodsprodln_fingoodsprod');//internal id of the line
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_customer', 'custrecordhtfingoodsprodln_fingoodsprod');//customer id
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_tank', 'custrecordhtfingoodsprodln_fingoodsprod');//tank item id
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_additiontanks', 'custrecordhtfingoodsprodln_fingoodsprod');//additional tanks
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_fullskidsqty', 'custrecordhtfingoodsprodln_fingoodsprod');//number of full skids
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_fullskids', 'custrecordhtfingoodsprodln_fingoodsprod');//number of full skid tanks
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_partskidsqty', 'custrecordhtfingoodsprodln_fingoodsprod');//number of partial skids
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_partialskids', 'custrecordhtfingoodsprodln_fingoodsprod');//number of partial skid tanks
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_totaltanks', 'custrecordhtfingoodsprodln_fingoodsprod');//total tanks
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_proddate', 'custrecordhtfingoodsprodln_fingoodsprod');//production dates
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_skiditem', 'custrecordhtfingoodsprodln_fingoodsprod');//production dates
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_prodschedule', 'custrecordhtfingoodsprodln_fingoodsprod');//production dates
	
	var searchResults = nlapiSearchRecord('customrecordhtfinishedgoodsproduction', null, filters, columns);
	if(searchResults != null && searchResults.length > 0)
	{	
		for(var i=0; i<searchResults.length; i++)
		{
			var lineInternalId = searchResults[i].getValue('internalid', 'custrecordhtfingoodsprodln_fingoodsprod');
			
			// only add the line if the internal id is set
			if (lineInternalId != null && lineInternalId != '')
			{
				var line = new Object();
				line.internalId = lineInternalId;
				line.customerId = searchResults[i].getValue('custrecordhtfingoodsprodln_customer', 'custrecordhtfingoodsprodln_fingoodsprod');//id
				line.tankId = searchResults[i].getValue('custrecordhtfingoodsprodln_tank', 'custrecordhtfingoodsprodln_fingoodsprod');//name
				line.skidId = searchResults[i].getValue('custrecordhtfingoodsprodln_skiditem', 'custrecordhtfingoodsprodln_fingoodsprod');//description
				line.additionalTanks = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_additiontanks', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//id
				line.fullSkids = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_fullskidsqty', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//name
				line.fullSkidTanks = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_fullskids', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//description
				line.partialSkids = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_partskidsqty', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//id
				line.partialSkidTanks = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_partialskids', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//name
				line.totalTanks = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_totaltanks', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//description
				line.productionDate = searchResults[i].getValue('custrecordhtfingoodsprodln_proddate', 'custrecordhtfingoodsprodln_fingoodsprod');
				line.productionScheduleId = searchResults[i].getValue('custrecordhtfingoodsprodln_prodschedule', 'custrecordhtfingoodsprodln_fingoodsprod');
				line.producedNotOnSchedule = true; // this flag identifies those lines that were produced directly from a schedule; we will set this to false later
				line.dateProduced = searchResults[i].getValue('custrecordhtfinishedgoodsprod_date');
				line.finishedGoodProductionId = searchResults[i].getId();
				line.statusId = searchResults[i].getValue('custrecordhtfinishedgoodsprod_status');
				line.statusText = searchResults[i].getText('custrecordhtfinishedgoodsprod_status');
				
				if (line.productionScheduleId == '')
					line.productionScheduleId = 0;
				
				if (line.customerId == '')
					line.customerId = 0;
				
				if (line.skidId == '')
					line.skidId = 0;
				
				finishedGoodsLines.push(line);
			}
		}
	}
	
	return finishedGoodsLines;
}

/**
 * There should only be 1 record that the search finds. If it finds 0, it then creates one with no lines
 * 
 * @param dataIn
 * @returns {___anonymous16493_16494}
 */
function HT_GetFinishedGoodsProductionRecord(dataIn) 
{
	var finishedGoodObj = new Object();
	finishedGoodObj.lines = new Array();
	
	//set properties of dataIn object to variables since we dont know the property names yet
	var paramLocation = dataIn.locationId;//location id
	var paramProductionLine = dataIn.productionLineId;//production line id
	var paramDate = dataIn.date;
	
	if(dataIn != null && dataIn != undefined && paramDate != undefined && paramLocation != undefined && paramProductionLine != undefined && paramShift != undefined)
	{
		var filters = new Array();
		
		filters[filters.length] = new nlobjSearchFilter('custrecordhtfinishedgoodsprod_status', null, 'is', HT_FINISHEDGOODSPRODSTATUS_OPEN);//status is open
		filters[filters.length] = new nlobjSearchFilter('custrecordhtfinishedgoodsprod_date', null, 'on', paramDate);
		filters[filters.length] = new nlobjSearchFilter('custrecordhtfinishedgoodsprod_location', null, 'is', paramLocation);
		filters[filters.length] = new nlobjSearchFilter('custrecordhtfinishedgoodsprod_prodline', null, 'is', paramProductionLine);
		filters[filters.length] = new nlobjSearchFilter('custrecordhtfinishedgoodsprod_shift', null, 'is', paramShift);
		
		var columns = new Array();
		
		//data for header
		columns[columns.length] = new nlobjSearchColumn('internalid');//id
		columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_date');//date
		columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_location');//location
		columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_prodline');//production line
		columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_shift');//shift
		
		//data for lines
		columns[columns.length] = new nlobjSearchColumn('internalid', 'custrecordhtfingoodsprodln_fingoodsprod');//internal id of the line
		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_customer', 'custrecordhtfingoodsprodln_fingoodsprod');//customer id
		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_tank', 'custrecordhtfingoodsprodln_fingoodsprod');//tank item id
		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_additiontanks', 'custrecordhtfingoodsprodln_fingoodsprod');//additional tanks
		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_fullskidsqty', 'custrecordhtfingoodsprodln_fingoodsprod');//number of full skids
		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_fullskids', 'custrecordhtfingoodsprodln_fingoodsprod');//number of full skid tanks
		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_partskidsqty', 'custrecordhtfingoodsprodln_fingoodsprod');//number of partial skids
		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_partialskids', 'custrecordhtfingoodsprodln_fingoodsprod');//number of partial skid tanks
		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_totaltanks', 'custrecordhtfingoodsprodln_fingoodsprod');//total tanks
		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_proddate', 'custrecordhtfingoodsprodln_fingoodsprod');//production dates
		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_skiditem', 'custrecordhtfingoodsprodln_fingoodsprod');//production dates
		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_prodschedule', 'custrecordhtfingoodsprodln_fingoodsprod');//production dates
		
		var fgLineItemIdsArray = new Array(); // use this later to set the "productedNotOnSchedule" flag; more detailed description below
		
		var searchResults = nlapiSearchRecord('customrecordhtfinishedgoodsproduction', null, filters, columns);
		if(searchResults != null && searchResults.length > 0)
		{	
			for(var i=0; i<searchResults.length; i++)
			{
				finishedGoodObj.internalId = searchResults[i].getValue('internalid');
				finishedGoodObj.date = searchResults[i].getValue('custrecordhtfinishedgoodsprod_date');
				finishedGoodObj.locationId = searchResults[i].getValue('custrecordhtfinishedgoodsprod_location');
				finishedGoodObj.productionLineId = searchResults[i].getValue('custrecordhtfinishedgoodsprod_prodline');
				finishedGoodObj.shiftId = searchResults[i].getValue('custrecordhtfinishedgoodsprod_shift');
				
				var lineInternalId = searchResults[i].getValue('internalid', 'custrecordhtfingoodsprodln_fingoodsprod');
				
				// only add the line if the internal id is set
				if (lineInternalId != null && lineInternalId != '')
				{
					var line = new Object();
					line.internalId = lineInternalId;
					line.customerId = searchResults[i].getValue('custrecordhtfingoodsprodln_customer', 'custrecordhtfingoodsprodln_fingoodsprod');//id
					line.tankId = searchResults[i].getValue('custrecordhtfingoodsprodln_tank', 'custrecordhtfingoodsprodln_fingoodsprod');//name
					line.skidId = searchResults[i].getValue('custrecordhtfingoodsprodln_skiditem', 'custrecordhtfingoodsprodln_fingoodsprod');//description
					line.additionalTanks = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_additiontanks', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//id
					line.fullSkids = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_fullskidsqty', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//name
					line.fullSkidTanks = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_fullskids', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//description
					line.partialSkids = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_partskidsqty', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//id
					line.partialSkidTanks = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_partialskids', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//name
					line.totalTanks = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_totaltanks', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//description
					line.productionDate = searchResults[i].getValue('custrecordhtfingoodsprodln_proddate', 'custrecordhtfingoodsprodln_fingoodsprod');
					line.productionScheduleId = searchResults[i].getValue('custrecordhtfingoodsprodln_prodschedule', 'custrecordhtfingoodsprodln_fingoodsprod');
					line.producedNotOnSchedule = true; // this flag identifies those lines that were produced directly from a schedule; we will set this to false later
					
					if (line.customerId == '')
						line.customerId = 0;
					
					if (line.skidId == '')
						line.skidId = 0;
					
					fgLineItemIdsArray[fgLineItemIdsArray.length] = line.internalId;
					
					finishedGoodObj.lines[finishedGoodObj.lines.length] = line;
				}
			}
		}
		else //if record doesnt exist, then create one  
		{
			var fgProductionRecord = nlapiCreateRecord('customrecordhtfinishedgoodsproduction');
			fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_date', paramDate);
			fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_location', paramLocation);
			fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_proddate', paramDate); // remove when we go live because this date doesn't mean anything
			fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_prodline', paramProductionLine);
			fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_shift', paramShift);
			fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_status', HT_FINISHEDGOODSPRODSTATUS_OPEN);
			var internalId = nlapiSubmitRecord(fgProductionRecord, true, false);
			
			finishedGoodObj.internalId = internalId;
			finishedGoodObj.date = paramDate;
			finishedGoodObj.locationId = paramLocation;
			finishedGoodObj.productionLineId = paramProductionLine;
			finishedGoodObj.shiftId = paramShift;
		}
		
		if (fgLineItemIdsArray.length > 0)
		{
			// now we need to identify any lines that were produced but weren't on a schedule
			// these are any FG Production lines that aren't linked to a Production Schedule WO line
			// so do a search for Production Sch WO Lines and find any lines that don't have one
			var scheduleWOResults = nlapiSearchRecord('customrecordhtproductionschedulewo', null, new nlobjSearchFilter('custrecordhtprodschwo_fgproductionline', null, 'anyof', fgLineItemIdsArray), new nlobjSearchColumn('custrecordhtprodschwo_fgproductionline'));
			
			if (scheduleWOResults != null && scheduleWOResults.length > 0)
			{
				for (var i=0; i<finishedGoodObj.lines.length; i++)
				{				
					for (var j=0; j<scheduleWOResults.length; j++)
					{
						if (finishedGoodObj.lines[i].internalId == scheduleWOResults[j].getValue('custrecordhtprodschwo_fgproductionline'))
						{
							// found a match so leave this at false;
							finishedGoodObj.lines[i].producedNotOnSchedule = false;
							break;
						}
					}
				}
			}
		}
	}
	
	return finishedGoodObj;
	
//	var finishedGoodObj = new Object();
//	finishedGoodObj.lines = new Array();
//	
//	//set properties of dataIn object to variables since we dont know the property names yet
//	var paramDate = dataIn.date;//date
//	var paramLocation = dataIn.locationId;//location id
//	var paramProductionLine = dataIn.productionLineId;//production line id
//	var paramShift = dataIn.shiftId;//shift id
//	
//	if(dataIn != null && dataIn != undefined && paramDate != undefined && paramLocation != undefined && paramProductionLine != undefined && paramShift != undefined)
//	{
//		var filters = new Array();
//		
//		filters[filters.length] = new nlobjSearchFilter('custrecordhtfinishedgoodsprod_status', null, 'is', HT_FINISHEDGOODSPRODSTATUS_OPEN);//status is open
//		filters[filters.length] = new nlobjSearchFilter('custrecordhtfinishedgoodsprod_date', null, 'on', paramDate);
//		filters[filters.length] = new nlobjSearchFilter('custrecordhtfinishedgoodsprod_location', null, 'is', paramLocation);
//		filters[filters.length] = new nlobjSearchFilter('custrecordhtfinishedgoodsprod_prodline', null, 'is', paramProductionLine);
//		filters[filters.length] = new nlobjSearchFilter('custrecordhtfinishedgoodsprod_shift', null, 'is', paramShift);
//		
//		var columns = new Array();
//		
//		//data for header
//		columns[columns.length] = new nlobjSearchColumn('internalid');//id
//		columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_date');//date
//		columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_location');//location
//		columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_prodline');//production line
//		columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_shift');//shift
//		
//		//data for lines
//		columns[columns.length] = new nlobjSearchColumn('internalid', 'custrecordhtfingoodsprodln_fingoodsprod');//internal id of the line
//		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_customer', 'custrecordhtfingoodsprodln_fingoodsprod');//customer id
//		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_tank', 'custrecordhtfingoodsprodln_fingoodsprod');//tank item id
//		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_additiontanks', 'custrecordhtfingoodsprodln_fingoodsprod');//additional tanks
//		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_fullskidsqty', 'custrecordhtfingoodsprodln_fingoodsprod');//number of full skids
//		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_fullskids', 'custrecordhtfingoodsprodln_fingoodsprod');//number of full skid tanks
//		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_partskidsqty', 'custrecordhtfingoodsprodln_fingoodsprod');//number of partial skids
//		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_partialskids', 'custrecordhtfingoodsprodln_fingoodsprod');//number of partial skid tanks
//		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_totaltanks', 'custrecordhtfingoodsprodln_fingoodsprod');//total tanks
//		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_proddate', 'custrecordhtfingoodsprodln_fingoodsprod');//production dates
//		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_skiditem', 'custrecordhtfingoodsprodln_fingoodsprod');//production dates
//		columns[columns.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_prodschedule', 'custrecordhtfingoodsprodln_fingoodsprod');//production dates
//		
//		var fgLineItemIdsArray = new Array(); // use this later to set the "productedNotOnSchedule" flag; more detailed description below
//		
//		var searchResults = nlapiSearchRecord('customrecordhtfinishedgoodsproduction', null, filters, columns);
//		if(searchResults != null && searchResults.length > 0)
//		{	
//			for(var i=0; i<searchResults.length; i++)
//			{
//				finishedGoodObj.internalId = searchResults[i].getValue('internalid');
//				finishedGoodObj.date = searchResults[i].getValue('custrecordhtfinishedgoodsprod_date');
//				finishedGoodObj.locationId = searchResults[i].getValue('custrecordhtfinishedgoodsprod_location');
//				finishedGoodObj.productionLineId = searchResults[i].getValue('custrecordhtfinishedgoodsprod_prodline');
//				finishedGoodObj.shiftId = searchResults[i].getValue('custrecordhtfinishedgoodsprod_shift');
//				
//				var lineInternalId = searchResults[i].getValue('internalid', 'custrecordhtfingoodsprodln_fingoodsprod');
//				
//				// only add the line if the internal id is set
//				if (lineInternalId != null && lineInternalId != '')
//				{
//					var line = new Object();
//					line.internalId = lineInternalId;
//					line.customerId = searchResults[i].getValue('custrecordhtfingoodsprodln_customer', 'custrecordhtfingoodsprodln_fingoodsprod');//id
//					line.tankId = searchResults[i].getValue('custrecordhtfingoodsprodln_tank', 'custrecordhtfingoodsprodln_fingoodsprod');//name
//					line.skidId = searchResults[i].getValue('custrecordhtfingoodsprodln_skiditem', 'custrecordhtfingoodsprodln_fingoodsprod');//description
//					line.additionalTanks = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_additiontanks', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//id
//					line.fullSkids = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_fullskidsqty', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//name
//					line.fullSkidTanks = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_fullskids', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//description
//					line.partialSkids = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_partskidsqty', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//id
//					line.partialSkidTanks = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_partialskids', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//name
//					line.totalTanks = ConvertNSFieldToInt(searchResults[i].getValue('custrecordhtfingoodsprodln_totaltanks', 'custrecordhtfingoodsprodln_fingoodsprod'), false);//description
//					line.productionDate = searchResults[i].getValue('custrecordhtfingoodsprodln_proddate', 'custrecordhtfingoodsprodln_fingoodsprod');
//					line.productionScheduleId = searchResults[i].getValue('custrecordhtfingoodsprodln_prodschedule', 'custrecordhtfingoodsprodln_fingoodsprod');
//					line.producedNotOnSchedule = true; // this flag identifies those lines that were produced directly from a schedule; we will set this to false later
//					
//					if (line.customerId == '')
//						line.customerId = 0;
//					
//					if (line.skidId == '')
//						line.skidId = 0;
//					
//					fgLineItemIdsArray[fgLineItemIdsArray.length] = line.internalId;
//					
//					finishedGoodObj.lines[finishedGoodObj.lines.length] = line;
//				}
//			}
//		}
//		else //if record doesnt exist, then create one  
//		{
//			var fgProductionRecord = nlapiCreateRecord('customrecordhtfinishedgoodsproduction');
//			fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_date', paramDate);
//			fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_location', paramLocation);
//			fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_proddate', paramDate); // remove when we go live because this date doesn't mean anything
//			fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_prodline', paramProductionLine);
//			fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_shift', paramShift);
//			fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_status', HT_FINISHEDGOODSPRODSTATUS_OPEN);
//			var internalId = nlapiSubmitRecord(fgProductionRecord, true, false);
//			
//			finishedGoodObj.internalId = internalId;
//			finishedGoodObj.date = paramDate;
//			finishedGoodObj.locationId = paramLocation;
//			finishedGoodObj.productionLineId = paramProductionLine;
//			finishedGoodObj.shiftId = paramShift;
//		}
//		
//		if (fgLineItemIdsArray.length > 0)
//		{
//			// now we need to identify any lines that were produced but weren't on a schedule
//			// these are any FG Production lines that aren't linked to a Production Schedule WO line
//			// so do a search for Production Sch WO Lines and find any lines that don't have one
//			var scheduleWOResults = nlapiSearchRecord('customrecordhtproductionschedulewo', null, new nlobjSearchFilter('custrecordhtprodschwo_fgproductionline', null, 'anyof', fgLineItemIdsArray), new nlobjSearchColumn('custrecordhtprodschwo_fgproductionline'));
//			
//			if (scheduleWOResults != null && scheduleWOResults.length > 0)
//			{
//				for (var i=0; i<finishedGoodObj.lines.length; i++)
//				{				
//					for (var j=0; j<scheduleWOResults.length; j++)
//					{
//						if (finishedGoodObj.lines[i].internalId == scheduleWOResults[j].getValue('custrecordhtprodschwo_fgproductionline'))
//						{
//							// found a match so leave this at false;
//							finishedGoodObj.lines[i].producedNotOnSchedule = false;
//							break;
//						}
//					}
//				}
//			}
//		}
//	}
//	
//	return finishedGoodObj;
}

/**
 * RESTlet that will get or create a finished good production record.
 * Uses the "Line" and the "Date" to determine whether or not to cretae a finished good record.
 * @param dataIn
 */
function HT_GetOrCreateFinishedGoodRecord(dataIn)
{
	var date = dataIn.date;
	var productionLineId = dataIn.productionLineId;
	var locationId = dataIn.locationId;
	var finishedGoodObj = new Object();
	
	// find any "Open" finished goods record by date and production line
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custrecordhtfinishedgoodsprod_status', null, 'is', HT_FINISHEDGOODSPRODSTATUS_OPEN));
	filters.push(new nlobjSearchFilter('custrecordhtfinishedgoodsprod_date', null, 'on', date));
	filters.push(new nlobjSearchFilter('custrecordhtfinishedgoodsprod_location', null, 'is', locationId));
	
	if (productionLineId != '' && productionLineId != null)
	{
		filters.push(new nlobjSearchFilter('custrecordhtfinishedgoodsprod_prodline', null, 'is', productionLineId));
	}
	
	var columns = new Array();
	columns[columns.length] = new nlobjSearchColumn('internalid');//id
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_date');//date
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_location');//location
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_prodline');//production line
	columns[columns.length] = new nlobjSearchColumn('custrecordhtfinishedgoodsprod_shift');//shift
	
	var searchResults = nlapiSearchRecord('customrecordhtfinishedgoodsproduction', null, filters, columns);
	if(searchResults != null && searchResults.length > 0)
	{	
		for(var i=0; i<searchResults.length; i++)
		{
			finishedGoodObj.internalId = searchResults[i].getValue('internalid');
			finishedGoodObj.date = searchResults[i].getValue('custrecordhtfinishedgoodsprod_date');
			finishedGoodObj.locationId = searchResults[i].getValue('custrecordhtfinishedgoodsprod_location');
			
			if (productionLineId != '' && productionLineId != null)
			{
				finishedGoodObj.productionLineId = searchResults[i].getValue('custrecordhtfinishedgoodsprod_prodline');
			}
			else
			{
				finishedGoodObj.productionLineId = '';
			}

			finishedGoodObj.shiftId = searchResults[i].getValue('custrecordhtfinishedgoodsprod_shift');
		}
	}
	else //if record doesnt exist, then create one  
	{
		var fgProductionRecord = nlapiCreateRecord('customrecordhtfinishedgoodsproduction');
		fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_date', date);
		fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_location', locationId);
		
		if (productionLineId != '' && productionLineId != null)
		{
			fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_prodline', productionLineId);
		}
		
		fgProductionRecord.setFieldValue('custrecordhtfinishedgoodsprod_status', HT_FINISHEDGOODSPRODSTATUS_OPEN);
		var internalId = nlapiSubmitRecord(fgProductionRecord, true, false);
		
		finishedGoodObj.internalId = internalId;
		finishedGoodObj.date = date;
		finishedGoodObj.locationId = locationId;
		
		if (productionLineId != '' && productionLineId != null)
		{
			finishedGoodObj.productionLineId = productionLineId;
		}
		else
		{
			finishedGoodObj.productionLineId = '';
		}
	}
	
	return finishedGoodObj;
}

/**
 * RESTlet that creates and returns a finished good line given the customer, item, and production date.
 * 
 * @param dataIn
 */
function HT_CreateFinishedGoodLine(dataIn) 
{
	var finishedGoodLine = new Object();
	
	// do a search to make sure one doesn't exist already
	var date = dataIn.date;
	var productionLineId = dataIn.productionLineId;
	var locationId = dataIn.locationId;
	
	var customerId = dataIn.customerId;
	var itemId = dataIn.itemId;
	var productionDate = dataIn.productionDate;
	var productionScheduleWOId = dataIn.productionScheduleWOId; // this is the production schedule WO ID that the finished goods production record will be linked to (not mandatory so could be blank)
	var productionScheduleId = dataIn.productionScheduleId; // this is the production schedule ID that the FG production line is linked to
	var createNewLine = dataIn.createNewLine; // this flag indicates that we should create a new line no matter if another one exists with the same criteria
	
	if (createNewLine == "True")
		createNewLine = true;
	else
		createNewLine = false;
	
	if (customerId == 0)
		customerId = '';
	
	// first, get or create a finished goods production reocrd to link to
	var finishedGoodsProductionObj = HT_GetOrCreateFinishedGoodRecord(dataIn);
	var finishedGoodProductionId = finishedGoodsProductionObj.internalId;
	
	if (createNewLine)
	{		
		// create a new line no matter what
		CreateFGProductionLine(finishedGoodLine, finishedGoodProductionId, customerId, itemId, productionDate, productionScheduleId, date);
	}
	else
	{
		// check and see if a line already exists and if not then create one
		var filters = new Array();
		filters[filters.length] = new nlobjSearchFilter('custrecordhtfingoodsprodln_fingoodsprod', null, 'is', finishedGoodProductionId);
		
		if (customerId == '')
			filters[filters.length] = new nlobjSearchFilter('custrecordhtfingoodsprodln_customer', null, 'is', '@NONE@');
		else
			filters[filters.length] = new nlobjSearchFilter('custrecordhtfingoodsprodln_customer', null, 'is', customerId);
		
		filters[filters.length] = new nlobjSearchFilter('custrecordhtfingoodsprodln_tank', null, 'is', itemId);
		filters[filters.length] = new nlobjSearchFilter('custrecordhtfingoodsprodln_proddate', null, 'on', productionDate);
		
		if (productionScheduleId != '' && productionScheduleId != null)
		{
			filters[filters.length] = new nlobjSearchFilter('custrecordhtfingoodsprodln_prodschedule', null, 'is', productionScheduleId);
		}
		
		var cols = new Array();
		cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_additiontanks');
		cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_fullskidsqty');
		cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_fullskids');
		cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_partskidsqty');
		cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_partialskids');
		cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_totaltanks');
		cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_skiditem');
		cols[cols.length] = new nlobjSearchColumn('custrecordhtfingoodsprodln_prodschedule');
		
		var results = nlapiSearchRecord('customrecordhtfinishedgoodsprodline', null, filters, cols);
		
		if (results != null && results.length > 0)
		{
			// we found some results so return that
			finishedGoodLine.internalId = results[0].getId();
			finishedGoodLine.customerId = customerId;
			finishedGoodLine.tankId = itemId;
			finishedGoodLine.skidId = results[0].getValue('custrecordhtfingoodsprodln_skiditem');
			finishedGoodLine.additionalTanks = ConvertNSFieldToInt(results[0].getValue('custrecordhtfingoodsprodln_additiontanks'), false);
			finishedGoodLine.fullSkids = ConvertNSFieldToInt(results[0].getValue('custrecordhtfingoodsprodln_fullskidsqty'), false);
			finishedGoodLine.fullSkidTanks = ConvertNSFieldToInt(results[0].getValue('custrecordhtfingoodsprodln_fullskids'), false);
			finishedGoodLine.partialSkids = ConvertNSFieldToInt(results[0].getValue('custrecordhtfingoodsprodln_partskidsqty'), false);
			finishedGoodLine.partialSkidTanks = ConvertNSFieldToInt(results[0].getValue('custrecordhtfingoodsprodln_partialskids'), false);
			finishedGoodLine.totalTanks = ConvertNSFieldToInt(results[0].getValue('custrecordhtfingoodsprodln_totaltanks'), false);
			finishedGoodLine.productionDate = productionDate;
			finishedGoodLine.productionScheduleId = results[0].getValue('custrecordhtfingoodsprodln_prodschedule');
			finishedGoodLine.producedNotOnSchedule = true;
			finishedGoodLine.finishedGoodProductionId = finishedGoodProductionId;
			finishedGoodLine.dateProduced = date;
			
			// customerId and skidId should be 0 if they aren't set
			if (finishedGoodLine.customerId == null || finishedGoodLine.customerId == '')
				finishedGoodLine.customerId = 0;
			
			if (finishedGoodLine.skidId == null || finishedGoodLine.skidId == '')
				finishedGoodLine.skidId = 0;
		}
		else
		{
			// none found so create the new record
			CreateFGProductionLine(finishedGoodLine, finishedGoodProductionId, customerId, itemId, productionDate, productionScheduleId, date);
		}
	}
	
	// now update the production schedule WO id with this record (if necessary)
	if (productionScheduleWOId != '' && productionScheduleWOId != null)
	{
		finishedGoodLine.producedNotOnSchedule = false;		
		nlapiSubmitField('customrecordhtproductionschedulewo', productionScheduleWOId, 'custrecordhtprodschwo_fgproductionline', finishedGoodLine.internalId, false);
	}
	
	nlapiLogExecution('debug', 'finishedGoodLine ID', finishedGoodLine.internalId);
	
	return finishedGoodLine;
}

/**
 * Creates a new finished good production line and returns it as an object.
 * @param finishedGoodProductionId
 * @param customerId
 * @param itemId
 * @param productionDate
 * @param productionScheduleId
 */
function CreateFGProductionLine(finishedGoodLine, finishedGoodProductionId, customerId, itemId, productionDate, productionScheduleId, date)
{
	// get the default skid quantity data since this is a new record
	var skidObj = HT_GetSkidQuantityData(itemId, customerId, null);
	
	var finishedGoodLineRec = nlapiCreateRecord('customrecordhtfinishedgoodsprodline', null);
	finishedGoodLineRec.setFieldValue('custrecordhtfingoodsprodln_fingoodsprod', finishedGoodProductionId);
	finishedGoodLineRec.setFieldValue('custrecordhtfingoodsprodln_customer', customerId);
	finishedGoodLineRec.setFieldValue('custrecordhtfingoodsprodln_tank', itemId);
	finishedGoodLineRec.setFieldValue('custrecordhtfingoodsprodln_additiontanks', 0);
	finishedGoodLineRec.setFieldValue('custrecordhtfingoodsprodln_fullskidsqty', 0);
	finishedGoodLineRec.setFieldValue('custrecordhtfingoodsprodln_fullskids', skidObj.quantity);
	finishedGoodLineRec.setFieldValue('custrecordhtfingoodsprodln_partskidsqty', 0);
	finishedGoodLineRec.setFieldValue('custrecordhtfingoodsprodln_partialskids', 0);
	finishedGoodLineRec.setFieldValue('custrecordhtfingoodsprodln_totaltanks', 0);
	finishedGoodLineRec.setFieldValue('custrecordhtfingoodsprodln_proddate', productionDate);
	finishedGoodLineRec.setFieldValue('custrecordhtfingoodsprodln_skiditem', skidObj.skidItemId);
	finishedGoodLineRec.setFieldValue('custrecordhtfingoodsprodln_prodschedule', productionScheduleId);
	
	var id = nlapiSubmitRecord(finishedGoodLineRec, true, false);
	
	finishedGoodLine.internalId = id;
	finishedGoodLine.customerId = customerId;
	finishedGoodLine.tankId = itemId;
	finishedGoodLine.skidId = skidObj.skidItemId;
	finishedGoodLine.additionalTanks = 0;
	finishedGoodLine.fullSkids = 0;
	finishedGoodLine.fullSkidTanks = skidObj.quantity;
	finishedGoodLine.partialSkids = 0;
	finishedGoodLine.partialSkidTanks = 0;
	finishedGoodLine.totalTanks = 0;
	finishedGoodLine.productionDate = productionDate;
	finishedGoodLine.productionScheduleId = productionScheduleId;
	finishedGoodLine.producedNotOnSchedule = true;
	finishedGoodLine.finishedGoodProductionId = finishedGoodProductionId;
	finishedGoodLine.dateProduced = date;
	
	// customerId and skidId should be 0 if they aren't set
	if (finishedGoodLine.customerId == null || finishedGoodLine.customerId == '')
		finishedGoodLine.customerId = 0;
	
	if (finishedGoodLine.skidId == null || finishedGoodLine.skidId == '')
		finishedGoodLine.skidId = 0;
	
	return finishedGoodLine;
}

/**
 * RESTlet that updates the data on a finished good production line.
 * 
 * @param dataIn
 */
function HT_UpdateFinishedGoodLine(dataIn) 
{
	var fgLineId = dataIn.finishedGoodProductionLineId;
	var customerId = dataIn.customerId;
	var itemId = dataIn.itemId;
	var additionalTanks = dataIn.additionalTanks;
	var fullSkids = dataIn.fullSkids;
	var fullSkidsQtyPerSkid = dataIn.fullSkidsQtyPerSkid;
	var partialSkids = dataIn.partialSkids;
	var partialSkidsQtyPerSkid = dataIn.partialSkidsQtyPerSkid;
	var totalTanks = dataIn.totalTanks;
	var productionDate = dataIn.productionDate;
	var skidItemId = dataIn.skidItemId;
	
	if (skidItemId == 0)
		skidItemId = '';
	
	if (customerId == 0)
		customerId = '';
	
	var fields = ['custrecordhtfingoodsprodln_customer', 
	              'custrecordhtfingoodsprodln_tank', 
	              'custrecordhtfingoodsprodln_additiontanks',
	              'custrecordhtfingoodsprodln_fullskidsqty',
	              'custrecordhtfingoodsprodln_fullskids',
	              'custrecordhtfingoodsprodln_partskidsqty',
	              'custrecordhtfingoodsprodln_partialskids',
	              'custrecordhtfingoodsprodln_totaltanks',
	              'custrecordhtfingoodsprodln_proddate',
	              'custrecordhtfingoodsprodln_skiditem'];
	
	var values = [	customerId,
		            itemId,
		            additionalTanks,
		            fullSkids,
		            fullSkidsQtyPerSkid,
		            partialSkids,
		            partialSkidsQtyPerSkid,
		            totalTanks,
		            productionDate,
		            skidItemId];
	
	// catch any submit errors
	// if it is a RCRD_DSNT_EXIST error, then don't throw it
	// someone must have deleted the record before this got called so we don't need to worry about it
	try
	{
		nlapiSubmitField('customrecordhtfinishedgoodsprodline', fgLineId, fields, values, true);
	}
	catch (ex)
	{
		if (ex instanceof nlobjError)
		{
			if (ex.getCode() != 'RCRD_DSNT_EXIST')
			{
				throw ex;
			}
		}
		else
		{
			throw ex;
		}
	}
}

/**
 * RESTlet that deletes a finished good production line.
 * 
 * @param dataIn
 */
function HT_DeleteFinishedGoodLine(dataIn) 
{
	var fgLineId = dataIn.finishedGoodProductionLineId;
	
	// do we need to delete the entire finished goods production record?
	// do that if there are not any lines on that record
	var fgProductionId = nlapiLookupField('customrecordhtfinishedgoodsprodline', fgLineId, 'custrecordhtfingoodsprodln_fingoodsprod', null);
	
	nlapiDeleteRecord('customrecordhtfinishedgoodsprodline', fgLineId);
	
	// see if there are any rows for the finished good production record; if not, then delete it
	var searchResults = nlapiSearchRecord('customrecordhtfinishedgoodsprodline', null, new nlobjSearchFilter('custrecordhtfingoodsprodln_fingoodsprod', null, 'is', fgProductionId), null);
	
	if (searchResults == null || searchResults.length == 0)
	{
		nlapiDeleteRecord('customrecordhtfinishedgoodsproduction', fgProductionId);
	}
}

/**
 * This RESTlet creates a search that returns a list of active Production Lines as a JSON object
 * 
 * @param dataIn - no parameters
 * @returns {Array}
 */
function HT_GetProductionLines(dataIn) 
{
	var productionLinesList = CustomListSearchResults('customlisthtproductionline', true);	
	return productionLinesList;
}

/**
 * This RESTlet creates a search that returns a list of active Production Shifts as a JSON object
 * 
 * @param dataIn
 * @returns {Array}
 */
function HT_GetShifts(dataIn) 
{	
	var shiftList = CustomListSearchResults('customlisthtproductionshift', true);	
	return shiftList;
}

/**
 * This RESTlet creates a search that returns a list of active Tank Series as a JSON object
 * 
 * @param dataIn
 * @returns {Array}
 */
function HT_GetSeries(dataIn) 
{
	var seriesList = CustomListSearchResults('customrecordht_tankseries', true);
	return seriesList;
}

/**
 * This RESTlet creates a search that returns a list of active Tank Types as a JSON object
 * 
 * @param dataIn
 * @returns {Array}
 */
function HT_GetTankType(dataIn) 
{
    var tankTypeList = CustomListSearchResults('customlisthttanktype', true);
	return tankTypeList;
}
