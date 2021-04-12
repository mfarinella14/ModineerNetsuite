// Acct: TSTDRV887020

/**
 * Common Script Library. The methods in this file can be used in different scripts.
 * @author ibrahima
 */
//************************** DEVELOPER NOTES ************************//
//
// This is a library script file used in different scripts.
// Only generic and common methods should be added in this file.
// To reference methods in this file in a script, select 'Common.js' as the library file on script record.
//
//************************** END DEVELOPER NOTES **********************//

//************************** COMMON METHODS *********************************//
/**
 * Returns item record whose item id is specified. This method has 10 usage points.
 * @param {Object} itemId
 * @return {nlapiLoadRecord} item record
 */
function GetItemRecord(itemId)
{
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid');
	cols[cols.length] = new nlobjSearchColumn('type');
	
	var results = nlapiSearchRecord('item', null, 
		new nlobjSearchFilter('internalid', null, 'anyof', itemId),
		cols);
	
	var type = null;	
	if (results != null && results.length > 0)
	{
		type = results[0].getRecordType();
	}
		
	if (type != null)
	{
		try {
            return nlapiLoadRecord(type, itemId);
        }
        catch(err)
        {
            return null;
        }
	}
	else
		return null;
}

/**
 * Return item amount for the specified pricelevel id.
 * This method can be used in things such as Mass Update to get MSRP Amount 
 * where GetMSRPForItem method cannot be used because we cannot access custom preferences in Mass Update context.
 * @param itemId
 * @returns {Float} Price Level Amount
 */
function GetItemAmountForPriceLevel(itemId, priceLevelId)
{
	if (priceLevelId != null && priceLevelId != '')
	{
		// run a search for the unit price for the item and the level
		var filters = new Array();
		filters[filters.length] = new nlobjSearchFilter('pricelevel', 'pricing', 'is', priceLevelId, null);
		filters[filters.length] = new nlobjSearchFilter('internalid', null, 'is', itemId, null);
		
		var cols = new Array();
		cols[cols.length] = new nlobjSearchColumn('unitprice', 'pricing', null);
		
		var results = nlapiSearchRecord('item', null, filters, cols);
		
		if (results != null && results.length > 0)
		{
			return ConvertNSFieldToFloat(results[0].getValue('unitprice', 'pricing'));
		}
						
		return 0;	

	}
	return 0;
}

//************************** END OF COMMON METHODS ****************************//


//***************** COMPANY PARAMETERS ************************//

/**
 * Returns the new change order approval group from the company preference script parameter
 * @return {nlapiLoadRecord} item record
 */
function GetNewChangeOrderApprovalGroup()
{
	return nlapiGetContext().getSetting('SCRIPT', 'custscriptnewhtchangeorderapprovalemail');	
}

/**
 * Returns the change order denied group from the company preference script parameter
 * @return {nlapiLoadRecord} item record
 */
function GetChangeOrderDeniedGroup()
{
	return nlapiGetContext().getSetting('SCRIPT', 'custscripthtchangeorderdeniedemail');	
}

/**
 * Returns the change order always email group from the company preference script parameter
 * @return {nlapiLoadRecord} item record
 */
function GetChangeOrderAlwaysEmailGroup()
{
	return nlapiGetContext().getSetting('SCRIPT', 'custscripthtchangeorderalwaysemail');	
}

/**
 * Gets Change Order from Employee Id.
 * @returns
 */
function GetChangeOrderFromEmployeeId()
{
	return nlapiGetContext().getSetting('SCRIPT', 'custscripthtchangeorderemailfromemployee');
}

/**
 * Returns whether or not the specified employee has the specified role.
 * Note: If employeeRecord is not null, this method will just check if that record has the specified role.
 *       If employeeRecord is null, this method will use the employeeId to load employee record and then check if the employee is assigned to the specified role.
 *       (If you have more than one role to check for the same employee, you should probably load employee record first and then pass that record in this method)
 * @param employeeId
 * @param roleId
 * @returns {Boolean}
 */
function HasRole(employeeId, employeeRecord, roleId)
{
	if(roleId != null && roleId != '')
	{
		var employee = employeeRecord;

		if(employee == null && employeeId != null && employeeId != '')
			employee = nlapiLoadRecord('employee', employeeId);
		
		if(employee != null)
		{
			var roleCount = employee.getLineItemCount('roles');		
			for(var i = 1; i <= roleCount; i++)
			{
				var currentRole = employee.getLineItemValue('roles', 'selectedrole', i);			
				if(currentRole == roleId)
				{
					return true;
				}
			}	
		}
	}
	return false;
}

/**
 * Returns whether or not the specified employee has Purchasing Role
 * @param employeeId
 * @returns
 */
function HasPurchasingRole(employeeId, employeeRecord)
{
	return HasRole(employeeId, employeeRecord, HT_ROLE_PURCHASING);
}

/**
 * Returns whether or not the specified employee has Customer Service Role
 * @param employeeId
 * @returns
 */
function HasCustomerServiceRole(employeeId, employeeRecord)
{
	return HasRole(employeeId, employeeRecord, HT_ROLE_CUSTOMER_SERVICE);
}

/**
 * Returns whether or not the specified employee has Shipping Role
 * @param employeeId
 * @returns
 */
function HasShippingRole(employeeId, employeeRecord)
{
	return HasRole(employeeId, employeeRecord, HT_ROLE_SHIPPING);
}

/**
 * Returns whether or not the specified employee has Production Role
 * @param employeeId
 * @returns
 */
function HasProductionRole(employeeId, employeeRecord)
{
	return HasRole(employeeId, employeeRecord, HT_ROLE_PRODUCTION);
}

/**
 * Returns whether or not the current user has the RVS Sales Manager function.
 */
function CurrentUserHasHTSalesPricingFunction()
{
	return HasHTSalesPricingFunction(nlapiGetUser());
}

/**
 * Returns whether the employee has the sales pricing function.
 * If the employeeId is null, then use the lookup fields.
 * If the lookup fields is null, then use the employee.
 * If both are null, then return false.
 * 
 * @param employeeId
 * @param lookupFields
 * 
 * @return {Boolean}
 */
function HasHTSalesPricingFunction(employeeId, lookupFields)
{
	return HasHTFunction(employeeId, lookupFields, 'custentityhtsalespricingfunction');
}


/**
 * Helper method that returns whether the employee has the given HT function set.
 * If the employeeId is null, then use the lookup fields.
 * If the lookup fields is null, then use the employee.
 * If both are null, then return false.
 * 
 * @param employeeId
 * @param lookupFields
 * 
 * @return {Boolean}
 */
function HasHTFunction(employeeId, lookupFields, functionFieldName)
{
	if (lookupFields == null)
	{
		if (employeeId != null)
		{
			lookupFields = GetHTFunctionsForEmployee(employeeId);
		}
	}
	
	if (lookupFields != null)
	{
		if (lookupFields[functionFieldName] == 'T')
			return true;
	}
	
	return false;
}

/**
 * Returns a lookup object containing the rvs functions for a given employee.
 * 
 * @param employeeId
 * @returns
 */
function GetHTFunctionsForEmployee(employeeId)
{
	return nlapiLookupField('employee', employeeId, ['custentityhtsalespricingfunction'], false);
}

/**
 * Returns account base URL (such as https://system.netsuite.com) from company preferences.
 */
function GetAccountBaseURL()
{
	return nlapiGetContext().getSetting('SCRIPT', 'custscripthtaccountbaseurl');	
}

//********END COMPANY PARAMETERS METHODS*************


//***************************** GENERIC METHODS ******************************//

/**
 * Returns a value of the browser url parameter specified.
 * @param {Object} paramName
 */
function GetURLParameterValue(paramName)
{
  paramName = paramName.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+paramName+"=([^&#]*)";
  var regex = new RegExp( regexS );
  var results = regex.exec( window.location.href );
  if( results == null )
    return "";
  else
    return results[1];
}

/**
 * Returns a value of the url parameter specified.
 * @param {Object} paramName
 */
function GetURLParameter(url, paramName)
{
  paramName = paramName.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+paramName+"=([^&#]*)";
  var regex = new RegExp( regexS );
  var results = regex.exec(url);
  if( results == null )
    return "";
  else
    return results[1];
}

/**
 * Removes all lines from a sublist whose type is specified.
 * @param {Object} type
 */
function RemoveAllLinesInSublist(type)
{
	var lineCount = nlapiGetLineItemCount(type);
	if(lineCount > 0)
	{
		for(var i = lineCount; i > 0; i--)
		{
			nlapiSelectLineItem(type, i);
			nlapiRemoveLineItem(type, i);
		}
	}
}

/**
 * 
 * @param {string} sString left and right trims specified string.
 * @return {string} Returns trimed string.
 */
function trim(sString) 
{ 
	if(sString != null)
	{
		sString = "" + sString; //convert any input to string
		while (sString.substring(0,1) == ' ') 
		{ 
			sString = sString.substring(1, sString.length); 
		} 
		while (sString.substring(sString.length-1, sString.length) == ' ') 
		{ 
			sString = sString.substring(0,sString.length-1); 
		} 
		return sString; 		
	}
	else
		return '';

} 

function CurrencyFormatted(amount)
{
	var i = parseFloat(amount);
	if(isNaN(i)) { i = 0.00; }
	var minus = '';
	if(i < 0) { minus = '-'; }
	i = Math.abs(i);
	i = parseInt((i + .005) * 100);
	i = i / 100;
	s = new String(i);
	if(s.indexOf('.') < 0) { s += '.00'; }
	if(s.indexOf('.') == (s.length - 2)) { s += '0'; }
	s = minus + s;
	return s;
}

/**
 * Returns today's date formatted as m/d/yyyy
 */
function getTodaysDate()
{
	var currentDate = new Date();
	var dd = currentDate.getDate();
	var mm = currentDate.getMonth() + 1;
	var yyyy = currentDate.getFullYear();
	var today = mm + '/' + dd + '/' + yyyy;
	return today; 
}

/**
 * Returns USA date formatted string. (month/day/year)
 * @param dateObject
 * @returns {String}
 */
function getUSFormattedDate(dateObject)
{
	return (dateObject.getMonth() + 1) + "/" + dateObject.getDate() + "/" + dateObject.getFullYear();
}

/**
 * Returns current time in am/pm format
 */
function getClockTime()
{
   var now    = new Date();
   var hour   = now.getHours();
   var minute = now.getMinutes();
   var second = now.getSeconds();
   var ap = "AM";
   
   if (hour   > 11) { ap = "PM"; }
   if (hour   > 12) { hour = hour - 12;}
   if (hour   == 0) { hour = 12; }
   if (hour   < 10) { hour   = "0" + hour; }
   if (minute < 10) { minute = "0" + minute;}
   if (second < 10) { second = "0" + second;}
   
   var timeString = hour + ':' + minute + ':' +second + " " + ap;
   return timeString;
} 

//***********************
// Name: GetIndexOf
// Description: Returns the index of the specified element from
//				the specified array. Apparently IE doesn't support
//				the build in indexOf method of arrays.
// Use: Helper Method
//************************
function GetIndexOf(inputArray, element)
{
	var elementIndex = -1;
	if(inputArray != null)
	{
		for(var i = 0; i < inputArray.length; i++)
		{
			if(inputArray[i] == element)
			{
				elementIndex = i;
				break;
			}		
		}
	}//end if(inputArray != null)
	
	return parseInt(elementIndex);
}

/**
 * Get nearest dollar amount for the specified value.
 * Example: If value = $100.01 then this method will return $101.00
 * @param {Object} value
 */
function GetNearestDollar(value)
{
	if(value == 0)
		return 0;
	else
	{
		//Chop floating point portion. This will give us the dollar amount
		//if value is 100.01, this will return 100
		var dollars = Math.floor(value);  
		var cents  = Math.floor((value % 1) * 100); //Chop everything else. This will retun the cents	
		if(dollars != 0)
		{
			if(cents == 0)
				return parseFloat(dollars);
			else
				return parseFloat(dollars + 1); //This will round up the dollar amount to the nearest dollar.		
		}
		else
			return 0;
	}
}

function ConvertCurrencyToEnglish(s)
{
	// Convert numbers to words
	// copyright 25th July 2006, by Stephen Chapman http://javascript.about.com
	// permission to use this Javascript on your web page is granted
	// provided that all of the code (including this copyright notice) is
	// used exactly as shown (you can change the numbering system if you wish)
	
	// American Numbering System
	var th = ['','thousand','million', 'billion','trillion'];
	// uncomment this line for English Number System
	// var th = ['','thousand','million', 'milliard','billion'];
	
	var dg = ['zero','one','two','three','four', 'five','six','seven','eight','nine']; 
	var tn = ['ten','eleven','twelve','thirteen', 'fourteen','fifteen','sixteen', 'seventeen','eighteen','nineteen']; 
	var tw = ['twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety']; 
	
// Convert numbers to words
// copyright 25th July 2006, by Stephen Chapman http://javascript.about.com
// permission to use this Javascript on your web page is granted
// provided that all of the code (including this copyright notice) is
// used exactly as shown (you can change the numbering system if you wish)

// American Numbering System
var th = ['','thousand','million', 'billion','trillion'];
// uncomment this line for English Number System
// var th = ['','thousand','million', 'milliard','billion'];

s = s.toString(); s = s.replace(/[\, ]/g,''); if (s != parseFloat(s)) return 'not a number'; var x = s.indexOf('.'); if (x == -1) x = s.length; if (x > 15) return 'too big'; var n = s.split(''); var str = ''; var sk = 0; for (var i=0; i < x; i++) {if ((x-i)%3==2) {if (n[i] == '1') {str += tn[Number(n[i+1])] + ' '; i++; sk=1;} else if (n[i]!=0) {str += tw[n[i]-2] + ' ';sk=1;}} else if (n[i]!=0) {str += dg[n[i]] +' '; if ((x-i)%3==0) str += 'hundred ';sk=1;} if ((x-i)%3==1) {if (sk) str += th[(x-i-1)/3] + ' ';sk=0;}} if (x != s.length) {var y = s.length; str += 'point '; for (var i=x+1; i<y; i++) str += dg[n[i]] +' ';} return str.replace(/\s+/g,' ');
}

// left padding s with c to a total of n chars
function padding_left(s, c, n) {
    if (! s || ! c || s.length >= n) {
        return s;
    }
    
    c = c.toString();
    s = s.toString();

    var max = (n - s.length)/c.length;
    for (var i = 0; i < max; i++) {
        s = c + s;
    }

    return s;
}

// right padding s with c to a total of n chars
function padding_right(s, c, n) {
    if (! s || ! c || s.length >= n) {
        return s;
    }

    c = c.toString();
    s = s.toString();
    
    var max = (n - s.length)/c.length;
    for (var i = 0; i < max; i++) {
        s += c;
    }

    return s;
}

function addCommas(nStr)
{
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

function RemoveDecimals(str)
{
	return str.substring(0, str.length-3);
}

function GetFileObjectFromHTML(html)
{
	var xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdf>" + html + "</pdf>";
	var file = nlapiXMLToPDF(xml);
	return file;
}

function PrintPDFInSuiteLet(request, response, pdfTitle, html)
{
	var file = GetFileObjectFromHTML(html);
	response.setContentType('PDF', pdfTitle); //, 'inline'); // per Andrew's request, we are not using inline for the printouts (9/13/2011 NAH)
	response.write( file.getValue() );   
}

function PrintPDFInSuiteletRecord(request, response, pdfTitle, type, id, mode, properties)
{
	var file = nlapiPrintRecord(type, id, mode, properties);
	response.setContentType('PDF', pdfTitle); //, 'inline'); // per Andrew's request, we are not using inline for the printouts (9/13/2011 NAH)
	response.write( file.getValue() );    
}

/**
 * 
 * 
 * @param listId (string) - customlist id
 * @param filterInactives (boolean) - true filters out the inactive lines
 * @returns {Array} of objects
 */
function CustomListSearchResults(listId, filterInactives)
{
	nlapiLogExecution('debug', 'CustomListSearchResults', 'Entered search function');
	var list = new Array();
	var lineItem = {};
	var results = '';
	var columns = new Array();
	var filters = new Array();
	
	columns[columns.length] = new nlobjSearchColumn('name');
	columns[columns.length] = new nlobjSearchColumn('internalid');
	
	filters[filters.length] = new nlobjSearchFilter('isinactive', null, 'is', true);
	//if true, filter inactive lines
	if(filterInactives)
	{
		results = nlapiSearchRecord(listId, null, filters, columns);
	}
	else
	{
		results = nlapiSearchRecord(listId, null, null, columns);
	}
	if(results != null)
	{
		nlapiLogExecution('debug', 'CustomListSearchResults', 'Results found');
		for(var i=0; i<results.length; i++)
		{
			lineItem = new Object();
			lineItem.name = results[i].getValue('name');
			nlapiLogExecution('debug', 'CustomListSearchResults', 'Name: ' + lineItem.name);
			lineItem.internalId = results[i].getValue('internalid');
			nlapiLogExecution('debug', 'CustomListSearchResults', 'ID: ' + lineItem.internalId);
			
			list[list.length] = lineItem;
		}
	}
	else
	{
		nlapiLogExecution('debug', 'CustomListSearchResults', 'No results found');
	}
	return list;
}
//************************* END OF GENERIC METHODS ******************************

/********* begin SCRIPTS FOR RETURNING ALL SEARCH RESULTS  *********/
// gets transaction results
// the unique column for transactions is line (which is the line id)
function GetTransactionResults(type, id, filter, cols)
{
	return GetSearchResults(type, id, filter, cols, 'line', null);
}

// get the search results
// if using a saved search, the search MUST BE SORTED BY INTERNALID AND THEN THE UNIQUE COLUMN
// parameters: 
// 	type: the type of the search (transaction, salesorder, item, inventoryitem, etc.)
// 	id: the id of the saved search (can be null)
// 	filter: any kind of special filters that need to be applied to the search (can be null)
// 	cols: any columns for the search...this is if the search is created dynamically (can be null -- and should be if the search is a saved search)
// 	uniqueCol: a unique column name (other than internalid) that can be used to make the line's unique.
//			  this could be a line id (line) for transactions or member items (memberitem) for items
//			  this is important in order to make sure that all the rows get pulled in only once
//			  this can be null if the internal id is the unique id
//  uniqueColJoin: this is the unique column join if the unique column is part of a join
//			  this can be null without any problems
function GetSearchResultsWithUniqueJoin(type, id, filter, cols, uniqueCol, uniqueColJoin)
{
	// initial values for internalid and uniqueColValue are -1
	// results is initially null
	return GetResults(type, id, filter, cols, -1, uniqueCol, uniqueColJoin, -1, null);
}

function GetSearchResults(type, id, filter, cols, uniqueCol)
{
	// initial values for internalid and uniqueColValue are -1
	// results is initially null
	return GetResults(type, id, filter, cols, -1, uniqueCol, null, -1, null);
}

// gets the results
// parameters:
// 	type: see above
// 	id: see above
// 	filter: see above
// 	cols: see above
// 	internalid: the last internal id of the results 
// 	uniqueCol: see above
// 	uniqueColValue: the last unique column value in the search. this prevents rows from being pulled in more than once
//  uniqueColJoin: this is the unique column join if the unique column is part of a join
// 	results: the results variable that gets passed on through
function GetResults(type, id, filter, cols, internalid, uniqueCol, uniqueColJoin, uniqueColValue, results)
{
	var MAX_SEARCH_RESULTS_ROWS = 1000; // the max search results that can be returned via nlapiSearchRecord
	
	// add any existing filters
	var filters = new Array();
	if (filter != null)
	{
		if (filter.length != null) // the filter may not be an array so there may not be a length
		{
			for (var i=0; i<filter.length; i++)
			{
				filters[filters.length] = filter[i];
			}
		}
		else
			filters[filters.length] = filter;
	}
	
	filters[filters.length] = new nlobjSearchFilter('internalidnumber', null, 'greaterthanorequalto', internalid);
		
	
	var tempResults = nlapiSearchRecord(type, id, filters, cols);
	if (tempResults != null)
	{
		// if results is null, then just set results, otherwise it already has values so concat the unique results in
		if (results == null)
			results = GetUniqueResults(tempResults, internalid, uniqueCol, uniqueColJoin, uniqueColValue);
		else
			results = results.concat(GetUniqueResults(tempResults, internalid, uniqueCol, uniqueColJoin, uniqueColValue));
		
		// if the results returned is equal to the max search results that can be returned, then it is possible
		// that there are still results that need to be returned so recursively call the same method again
		if (tempResults.length == MAX_SEARCH_RESULTS_ROWS)
		{
			// get last internalid and unique column value (if unique column isn't null)
			var lastInternalid = results[results.length-1].getId();
			var lastUniqueColValue = null;
			if (uniqueCol != null)
				lastUniqueColValue = results[results.length-1].getValue(uniqueCol, uniqueColJoin);
				
			results = GetResults(type, id, filter, cols, lastInternalid, uniqueCol, uniqueColJoin, lastUniqueColValue, results);
		}
	}
	
	return results;	
}

// returns an array of unique results
// for example: if a transaction has two line items then its internalid is listed twice so we need another 
//				column to be unique and then we know the last values and can return only results that 
//				that are greater than them
// parameters:
// 	results: these are results passed in that need to be make unique
// 	internalid: this is the last internalid
// 	uniqueCol: this is the unique column to filter out by as well
//  uniqueColJoin: this is the unique column join if the unique column is part of a join
// 	uniqueColValue: this is the last unique column value
function GetUniqueResults(results, internalid, uniqueCol, uniqueColJoin, uniqueColValue)
{
	var tempResults = new Array();
	for (var i=0; i<results.length; i++)
	{
		// if the unique col isn't null, then filter by the internalid and the unique column
		if (uniqueCol != null)
		{
			var resultsUniqueColConverted;
			var uniqueColConverted;
			// try and parse out the int
			// if that fails for one of the values, then compare strings
			if (IsNumeric(results[i].getValue(uniqueCol, uniqueColJoin)) == true &&
				IsNumeric(uniqueColValue) == true)
			{
				// then parse them
				resultsUniqueColConverted = parseInt(results[i].getValue(uniqueCol, uniqueColJoin));
				uniqueColConverted = parseInt(uniqueColValue);
			}
			else
			{
				resultsUniqueColConverted = results[i].getValue(uniqueCol, uniqueColJoin).toString();
				uniqueColConverted = uniqueColValue.toString();
			}
			
			if (!(results[i].getId() == internalid && resultsUniqueColConverted <= uniqueColConverted))
			{
				tempResults[tempResults.length] = results[i];
			}
		}
		else // the unique column is null so the internalid is the only thing to filter by
		{			
			if (results[i].getId() != internalid)
			{
				tempResults[tempResults.length] = results[i];
			}
		}
	}
	return tempResults;
}

// special method that returns whether or not the given string is numeric
// it is not as simple as calling isNaN because if the string starts with a number (but then contains characters)
// isNaN will still return false. ie: 123EFG would be a number but EFG123 wouldn't... which is wrong
function IsNumeric(sText)
{
	if (sText != null) 
	{
		var ValidChars = "0123456789.";
		var IsNumber = true;
		var Char;		
		
		for (i = 0; i < sText.length && IsNumber == true; i++) 
		{
			Char = sText.charAt(i);
			if (i==0 && Char == '-') // could be negative
			{
				// do nothing
			}
			else if (ValidChars.indexOf(Char) == -1) 
			{
				IsNumber = false;
			}
		}
		return IsNumber;
	}
	return false;
}

function ConvertNSFieldToInt(value, blankIfNull)
{
	if (blankIfNull)
	{
		if (value == null || value == '')
			return '';
		else 
			return parseInt(value);
	}
	else
	{
		if (value == null || value == '')
			return 0;
		else 
			return parseInt(value);
	}
}

function ConvertNSFieldToNullableInt(value, blankIfNull)
{
	if (blankIfNull)
	{
		if (value == null || value == '')
			return null;
		else 
			return parseInt(value);
	}
	else
	{
		if (value == null || value == '')
			return 0;
		else 
			return parseInt(value);
	}
}

function ConvertNSFieldToFloat(value, blankIfNull)
{
	if (blankIfNull)
	{
		if (value == null || value == '')
			return '';
		else 
			return parseFloat(value);
	}
	else
	{
		if (value == null || value == '')
			return 0;
		else 
			return parseFloat(value);
	}
}

function ConvertNSFieldToString(value)
{
	if (value == null)
		return '';
	else 
		return nlapiEscapeXML(value);
}

/** 
 * Disables this button on the form.
 * 
 * @param {nlobjForm} form 
 * @param {nlobjSublist} sublist
 * @param {String} buttonName 
 */
function DisableButton(form, sublist, buttonName)
{
	if (sublist != null)
	{
		var button = sublist.getButton(buttonName);
		if (button != null)
			button.setDisabled(true);
	}
	else if (form != null)
	{
		var button = form.getButton(buttonName);
		if (button != null)
			button.setDisabled(true);
	}
}

/** 
 * Set the display type of this field on the form.
 * 
 * @param {nlobjForm} form 
 * @param {String} fieldName 
 */
function SetFieldDisplayType(form, fieldName, displayType)
{
	if (form != null)
	{
		var field = form.getField(fieldName);
		if (field != null)
			field.setDisplayType(displayType);
	}
}

/**
 * Returns the company's page logo.
 * 
 * @returns {String} page logo URL.
 */
function GetCompanyPageLogo()
{
	var companyInfo = nlapiLoadConfiguration('companyinformation');
	var companyFormLogoId = companyInfo.getFieldValue('formlogo');
	
	if (companyFormLogoId != '' && companyFormLogoId != null)
	{
		var logo = nlapiLoadFile(companyFormLogoId);
		return nlapiEscapeXML(logo.getURL());
	}
	return '';
}

/**
 * Returns the company's name from company information configuration.
 * If useLegalName is true, company's legal name is returned otherwise, company name is returned.
 * @returns {String} Company Name
 */
function GetCompanyName(useLegalName)
{
	var companyInfo = nlapiLoadConfiguration('companyinformation');
	var companyName = '';
	if(useLegalName)
		companyName = companyInfo.getFieldValue('legalname');
	else
		companyName = companyInfo.getFieldValue('companyname');
	 
	if(companyName == null)
		companyName = '';
	
	return companyName;
}

/**
 * Returns the company's complete shipping address from company information configuration.
 * @param {Boolean} singeLine: Whether or not address shoud be formatted in a single line.
 * @returns {String} Company Shipping Address
 */
function GetCompanyShippingAddress(singleLine)
{
	var companyInfo = nlapiLoadConfiguration('companyinformation');
	var shippingAddress = '';
	if(!singleLine)
	{
		var shipAddr1 = companyInfo.getFieldValue('shippingaddress1');  
		if(shipAddr1 == null)
			shipAddr1 = '';
		
		var shipCity = companyInfo.getFieldValue('shippingcity'); 
		if(shipCity == null)
			shipCity = '';
		
		var shipState = companyInfo.getFieldValue('shippingstate'); 
		if(shipState == null)
			shipState = '';

		var shipZip = companyInfo.getFieldValue('shippingzip'); 
		if(shipZip == null)
			shipZip = '';
		 
		var shipCountry = companyInfo.getFieldValue('shippingcountry'); 
		if(shipCountry == null)
			shipCountry = '';	
		else if(shipCountry.toLowerCase() == 'us')
			shipCountry = 'United States';
		else if(shipCountry.toLowerCase == 'ca')
			shipCountry = 'Canada';
		 
		if (shipAddr1 != '')
			shippingAddress = shipAddr1 + "<br />";
		
		if(shipCity != '')
		{
			if(shipState != '')
				shippingAddress += shipCity + ', ' + shipState;
		}
		else //no ship city
		{
			if(shipState != '')
				shippingAddress += shipState;	
		}
		
		if (shipZip != '' )
			shippingAddress += ' ' + shipZip;
		if (shipCountry != '')
			shippingAddress += "<br />" + shipCountry;
		
		if (shippingAddress == '')
		{
			var shipAddressFull = companyInfo.getFieldValue('shippingaddress_text');

			shipAddressFull = shipAddressFull.split("\n");
			
			if(shipAddressFull[2] == null)
				shipAddressFull[2] = '';	
			else if(shipAddressFull[2].toLowerCase() == 'us')
				shipAddressFull[2] = 'United States';
			else if(shipAddressFull[2].toLowerCase == 'ca')
				shipAddressFull[2] = 'Canada';
			
			shippingAddress = shipAddressFull[0] + "<br />";
			shippingAddress += ' ' + shipAddressFull[1];
			shippingAddress += "<br />" + shipAddressFull[2];
		}
	}
	else
	{
		shippingAddress = companyInfo.getFieldValue('shippingaddress1') + ', ' +  companyInfo.getFieldValue('shippingcity') + ', ' +
						  companyInfo.getFieldValue('shippingstate') + ' ' + companyInfo.getFieldValue('shippingzip'); 	
	}

	return shippingAddress;
}

/**
 * Disables a bunch of netsuite buttons for the specified form.
 * Buttons that are disabled by this method are: 
 * "Save & Copy", "Save & New", "Copy Previous", "Save & Print", "Reset", "New", "Make Copy", "Email", "Register"
 * "Print" unless enablePrintButton is set to true and "Save" button if disableSubmitButton is set to true.
 * We mainly use this function on dealer portal where dealers should not have access to these buttons.
 * @param form
 * @param enablePrintButton. Whether or not enable 'Print' button. By default, this button is disabled.
 * @param disableSubmitButton. Whether or not disable 'Submit' button. By default, this button is enabled.
 * @param enableNewButton. Whether or not enable 'New' button. By default, this button is disabled.
 */
function DisableNetsuiteButtons(form, enablePrintButton, disableSubmitButton, enableNewButton)
{
	if(form != null)
	{
		//Hide NS buttons
	    var btn = form.getButton('submitcopy');         
	    if (btn != null)
	           btn.setDisabled(true);
	    
	    btn = form.getButton('submitnew');       
	    if (btn != null)
	           btn.setDisabled(true);
	    
	    //Disable submit button if specified. By default this is not disabled.
	    if(disableSubmitButton != null && disableSubmitButton != undefined && disableSubmitButton)
    	{
		    btn = form.getButton('submitter');       
		    if (btn != null)
		           btn.setDisabled(true);
    	}	    
	    	    
	    btn = form.getButton('autofill'); //Copy Previous button
	    if(btn != null)
	    	btn.setDisabled(true);
	    
	    btn = form.getButton('saveprint');
	    if(btn != null)
	    	btn.setDisabled(true);
	    
	    btn = form.getButton('resetter');        
	    if (btn != null)
	           btn.setDisabled(true);
	    
	    if(enableNewButton == null || enableNewButton == undefined || !enableNewButton)
    	{
		    btn = form.getButton('new');             
		    if (btn != null)
		           btn.setDisabled(true);    	
    	}
	    
	    btn = form.getButton('makecopy');        
	    if (btn != null)
	           btn.setDisabled(true);
	    
	    //Enable 'Print' button if specified. By default, this is not enabled.
	    if(enablePrintButton == null || enablePrintButton == undefined || !enablePrintButton)
    	{
		    btn = form.getButton('print');           
		    if (btn != null)
		           btn.setDisabled(true);   	
    	}
	    
	    btn = form.getButton('email');           
	    if (btn != null)
	           btn.setDisabled(true);
	    
	    btn = form.getButton('gotoregister');           
	    if (btn != null)
	           btn.setDisabled(true);
	}
}

/**
 * Returns full error message given an error object.
 * @param errorObj. This can be either NS error object or other type of error object.
 * @returns
 */
function GetErrorMessage(errorObj)
{
	var errorcode = null;
	try 
	{
		errorcode = errorObj.getCode();		
		try 
		{
			errorcode += '\n' + errorObj.getDetails() + '\n' + errorObj.getStackTrace();
		}
		catch (err3) { }
	}
	catch (err2) 
	{ 
		// if it is not a netsuite error, then getCode() will not work an exception is thrown
		// this means that the error was some other kind of error
		try 
		{
			errorcode += errorObj.description + '\n' + errorObj.name + '\n' + errorObj.message;
		}
		catch (err3)
		{
			errorcode = "Unknown error.";
		}
	}
	
	return errorcode;
}

/**
 * Schedules a script. If there is no deployment set (null), then it will use the next available deployment.
 * If no deployment exists, then it will create a new deployment given the script internalId.
 * @param scriptId
 * @param deployId
 * @param params
 * @param {Boolean} runAsAdmin - Whether or not to execute the deployment as an Admin.
 */
function ScheduleScript(scriptId, deployId, params, runAsAdmin)
{
	// if the deployments are set, then use them
	if (deployId != null && deployId != '')
	{
		return nlapiScheduleScript(scriptId, deployId, params);
	}
	else
	{
		// try to deploy the script
		var status = nlapiScheduleScript(scriptId, null, params);
		
		// if the status of the script is not QUEUED, then automatically create a new deployment and deploy it
		if(status != 'QUEUED')
		{
			// do a search that looks up the internal id of the script where the script id is the one being passed in.
			var searchResults = nlapiSearchRecord('script', null, new nlobjSearchFilter('scriptid', null, 'is', scriptId), null);
			
			if (searchResults != null && searchResults.length > 0)
			{
				var initArray = new Array();
	            initArray['script'] = searchResults[0].getId();

	            var deployment = nlapiCreateRecord('scriptdeployment', initArray);
	            deployment.setFieldValue('isdeployed', 'T');
	            deployment.setFieldValue('title', 'Auto Deployment');	
	            if (runAsAdmin != undefined && runAsAdmin != null)
            	{
	            	if(runAsAdmin)
            		{
	            		deployment.setFieldValue('runasrole', HT_ROLE_ADMIN);
            		}
            	}
	            	
	            var newDeployId = nlapiSubmitRecord(deployment);
	            
	            // we need the deployment's script id (not the internalid), so look it up.
	            var newDeployment= nlapiLoadRecord('scriptdeployment', newDeployId);
                var newDeployScriptId = newDeployment.getFieldValue('scriptid');
                
	            return nlapiScheduleScript(scriptId, newDeployScriptId, params);
			}
			else
			{
				throw nlapiCreateError('CANNOTAUTOSCHEDULESCRIPT', 'Script ' + scriptId + ' cannot automatically be rescheduled because script cannot be found in a search.', false);
			}
		}
		
		return status;
	}
}

/**
 * Gets company information using Suitelet.
 * We use this method when we need to get company information via Restlet or 
 * other framework for users that are not admins. 
 * Note: Suitelet must be Available Without Login.
 * @param request
 * @param response
 */
function GetCompanyInfoSuitlet(request, response)
{
	if(request.getMethod() == 'GET')
	{
		var companyInfo = nlapiLoadConfiguration('companyinformation');
		var objCompany = new Object();
		objCompany.name = companyInfo.getFieldValue('companyname');
		objCompany.address1 = companyInfo.getFieldValue('address1');
		objCompany.address2 = companyInfo.getFieldValue('address2');
		objCompany.city = companyInfo.getFieldValue('city');
		objCompany.state = companyInfo.getFieldValue('state');
		objCompany.zip = companyInfo.getFieldValue('zip');
		
		if (objCompany.address1 == null)
		{
			var mainAddressFull = companyInfo.getFieldValue('mainaddress_text');
			mainAddressFull = mainAddressFull.split("\r\n");
			objCompany.address1 = mainAddressFull[0];
		}
		
		response.write(JSON.stringify(objCompany));		
		
	}

}


/**
 * This method is a JavaScript extension to the ECMA-262 standard; 
 * as such it may not be present in other implementations of the standard. 
 * To make it work you need to add following code at the top of your script.
 * Refrence: http://www.tutorialspoint.com/javascript/array_filter.htm
 */
if (!Array.prototype.filter)
{
  Array.prototype.filter = function(fun /*, thisp*/)
  {
    var len = this.length;
    if (typeof fun != "function")
      throw new TypeError();

    var res = new Array();
    var thisp = arguments[1];
    for (var i = 0; i < len; i++)
    {
      if (i in this)
      {
        var val = this[i]; // in case fun mutates this
        if (fun.call(thisp, val, i, this))
          res.push(val);
      }
    }

    return res;
  };
}

/**
 * Returns True or False, if the time passed is currently in dayling saving time
 * @param dateTime
 * @returns
 */
function IsDaylightSavingTime(dateTime) 
{
    return dateTime.getTimezoneOffset() < StandardTimezoneOffset(dateTime);
}

/**
 * Returns the standard time zone offset.
 * @param dateTime
 * @returns
 */
function StandardTimezoneOffset(dateTime)
{
    var jan = new Date(dateTime.getFullYear(), 0, 1);
    var jul = new Date(dateTime.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

/**
 * Pads a number to two digits.
 * @param number
 * @returns
 */
function NumberToTwoDigits(number) 
{
    return (number < 10 ? '0' : '') + number;
}

if(!String.prototype.replaceAll)
{
	String.prototype.replaceAll = function( token, newToken, ignoreCase ) {
	    var _token;
	    var str = this + "";
	    var i = -1;

	    if ( typeof token === "string" ) {

	        if ( ignoreCase ) {

	            _token = token.toLowerCase();

	            while( (
	                i = str.toLowerCase().indexOf(
	                    token, i >= 0 ? i + newToken.length : 0
	                ) ) !== -1
	            ) {
	                str = str.substring( 0, i ) +
	                    newToken +
	                    str.substring( i + token.length );
	            }

	        } else {
	            return this.split( token ).join( newToken );
	        }

	    }
	return str;
	};
}

/**
 * Returns skid quantity data for an item and a customer.
 * @param itemId
 * @param customerId
 */
function HT_GetSkidQuantityData(itemId, customerId, skidItemId)
{
	var obj = new Object();
	obj.itemId = itemId;
	obj.customerId = customerId;
	obj.skidItemId = skidItemId;
	obj.quantity = 0;
	
	// if the skid item id is null, then we are looking for both the skid and the quantity
	// if the skid item isn't null, then we are looking for the quantity for that skid and customer
	if (skidItemId == null)
	{
		if (customerId != "" && customerId != 0)
		{
			// do a search to get the item information with item skid quantity data (if necessary)
			var itemFilters = new Array();
			itemFilters[itemFilters.length] = new nlobjSearchFilter('internalid', null, 'is', itemId, null);
			
			var itemCols = new Array();
			itemCols[itemCols.length] = new nlobjSearchColumn('custitemhttankseries');
			itemCols[itemCols.length] = new nlobjSearchColumn('custitemhttanktype');
			itemCols[itemCols.length] = new nlobjSearchColumn('internalid', 'custrecordhtitemskidqty_item');
			itemCols[itemCols.length] = new nlobjSearchColumn('custrecordhtitemskidqty_skiditem', 'custrecordhtitemskidqty_item');
			itemCols[itemCols.length] = new nlobjSearchColumn('custrecordhtitemskidqty_quantity', 'custrecordhtitemskidqty_item');
			itemCols[itemCols.length] = new nlobjSearchColumn('custrecordhtitemskidqty_group', 'custrecordhtitemskidqty_item');
			itemCols[itemCols.length] = new nlobjSearchColumn('custrecordhtitemskidqty_heattreatedskid', 'custrecordhtitemskidqty_item');
			
			var itemResults = nlapiSearchRecord('item', null, itemFilters, itemCols);	
			
			// find the series and tank type of the item to pass in via the customer filters
			var seriesId = null;
			var tankTypeId = null;
			
			if (itemResults != null && itemResults.length > 0)
			{
				seriesId = itemResults[0].getValue('custitemhttankseries');
				tankTypeId = itemResults[0].getValue('custitemhttanktype');
			}
			
			// do a search to get the customer information with customer skid quantity data
			var customerFilters = new Array();
			customerFilters[customerFilters.length] = new nlobjSearchFilter('internalid', null, 'is', customerId, null);
			
			var customerCols = new Array();
			customerCols[customerCols.length] = new nlobjSearchColumn('custentityht_skidquantitygroup');
			customerCols[customerCols.length] = new nlobjSearchColumn('custentityht_requiresheattreatedskid');
			customerCols[customerCols.length] = new nlobjSearchColumn('internalid', 'custrecordhtcustskidqty_customer');
			customerCols[customerCols.length] = new nlobjSearchColumn('custrecordhtcustskidqty_series', 'custrecordhtcustskidqty_customer');
			customerCols[customerCols.length] = new nlobjSearchColumn('custrecordhtcustskidqty_tanktype', 'custrecordhtcustskidqty_customer');
			customerCols[customerCols.length] = new nlobjSearchColumn('custrecordhtcustskidqty_item', 'custrecordhtcustskidqty_customer');
			customerCols[customerCols.length] = new nlobjSearchColumn('custrecordhtcustskidqty_skiditem', 'custrecordhtcustskidqty_customer');
			customerCols[customerCols.length] = new nlobjSearchColumn('custrecordhtcustskidqty_quantity', 'custrecordhtcustskidqty_customer');
			
			var customerResults = nlapiSearchRecord('customer', null, customerFilters, customerCols);
			
			if (customerResults != null && customerResults.length > 0)
			{
				// get the skid quantity group from the customer
				var skidQuantityGroupId = customerResults[0].getValue('custentityht_skidquantitygroup');
				var requiresHeatTreatedSkid = customerResults[0].getValue('custentityht_requiresheattreatedskid');
				
				// first look and see if there is a item-specific line
				for (var i=0; i<customerResults.length; i++)
				{
					if (customerResults[i].getValue('custrecordhtcustskidqty_item', 'custrecordhtcustskidqty_customer') == itemId)
					{
						obj.skidItemId = ConvertNSFieldToNullableInt(customerResults[i].getValue('custrecordhtcustskidqty_skiditem', 'custrecordhtcustskidqty_customer'), true);
						obj.quantity = ConvertNSFieldToNullableInt(customerResults[i].getValue('custrecordhtcustskidqty_quantity', 'custrecordhtcustskidqty_customer'), false);
						
						break;
					}
				}
				
				// if we couldn't find an item-specific one, look for one where the tank type and series are set
				if (obj.skidItemId == null)
				{
					for (var i=0; i<customerResults.length; i++)
					{
						if (	customerResults[i].getValue('custrecordhtcustskidqty_series', 'custrecordhtcustskidqty_customer') == seriesId && 
								customerResults[i].getValue('custrecordhtcustskidqty_tanktype', 'custrecordhtcustskidqty_customer') == tankTypeId)
						{
							obj.skidItemId = ConvertNSFieldToNullableInt(customerResults[i].getValue('custrecordhtcustskidqty_skiditem', 'custrecordhtcustskidqty_customer'), true);
							obj.quantity = ConvertNSFieldToNullableInt(customerResults[i].getValue('custrecordhtcustskidqty_quantity', 'custrecordhtcustskidqty_customer'), false);
							
							break;
						}
					}
				}
				
				// if we still don't have one set, then look for any record where the series is set but the tank type isn't and see if that matches
				if (obj.skidItemId == null)
				{
					for (var i=0; i<customerResults.length; i++)
					{
						if (	customerResults[i].getValue('custrecordhtcustskidqty_series', 'custrecordhtcustskidqty_customer') == seriesId && 
								customerResults[i].getValue('custrecordhtcustskidqty_tanktype', 'custrecordhtcustskidqty_customer') == '')
						{
							obj.skidItemId = ConvertNSFieldToNullableInt(customerResults[i].getValue('custrecordhtcustskidqty_skiditem', 'custrecordhtcustskidqty_customer'), true);
							obj.quantity = ConvertNSFieldToNullableInt(customerResults[i].getValue('custrecordhtcustskidqty_quantity', 'custrecordhtcustskidqty_customer'), false);
							
							break;
						}
					}
				}
				
				// if we don't have one set, then there must not be a customer-specific one
				// find what "level" the customer is at and look it up on the item
				if (obj.skidItemId == null)
				{
					for (var i=0; i<itemResults.length; i++)
					{
						if (itemResults[i].getValue('custrecordhtitemskidqty_group', 'custrecordhtitemskidqty_item') == skidQuantityGroupId)
						{
							// if the customer requires a heat treated skid and if there is a heat treated skid set on the item line, use it
							// otherwise, use the normal skid item
							if (requiresHeatTreatedSkid == 'T')
							{
								var heatTreatedSkidId = itemResults[i].getValue('custrecordhtitemskidqty_heattreatedskid', 'custrecordhtitemskidqty_item');
								
								if (heatTreatedSkidId != '' && heatTreatedSkidId != null)
								{
									obj.skidItemId = ConvertNSFieldToNullableInt(heatTreatedSkidId, true);
								}
								else
								{
									obj.skidItemId = ConvertNSFieldToNullableInt(itemResults[i].getValue('custrecordhtitemskidqty_skiditem', 'custrecordhtitemskidqty_item'), true);
								}
							}
							else
							{
								obj.skidItemId = ConvertNSFieldToNullableInt(itemResults[i].getValue('custrecordhtitemskidqty_skiditem', 'custrecordhtitemskidqty_item'), true);
							}							
							
							obj.quantity = ConvertNSFieldToNullableInt(itemResults[i].getValue('custrecordhtitemskidqty_quantity', 'custrecordhtitemskidqty_item'), false);
						}
					}
				}
			}
		}
	}
	else
	{		
		// first, see if there are any customer-specific skid quantity results for this skid and this item
		// second, see if there a skid item on the item specifically and use that quantity
		
		// get the item results so we can get the series and tank type
		var itemFilters = new Array();
		itemFilters[itemFilters.length] = new nlobjSearchFilter('internalid', null, 'is', itemId, null);
		
		var itemCols = new Array();
		itemCols[itemCols.length] = new nlobjSearchColumn('custitemhttankseries');
		itemCols[itemCols.length] = new nlobjSearchColumn('custitemhttanktype');
		itemCols[itemCols.length] = new nlobjSearchColumn('internalid', 'custrecordhtitemskidqty_item');
		itemCols[itemCols.length] = new nlobjSearchColumn('custrecordhtitemskidqty_skiditem', 'custrecordhtitemskidqty_item');
		itemCols[itemCols.length] = new nlobjSearchColumn('custrecordhtitemskidqty_quantity', 'custrecordhtitemskidqty_item');
		itemCols[itemCols.length] = new nlobjSearchColumn('custrecordhtitemskidqty_group', 'custrecordhtitemskidqty_item');
		itemCols[itemCols.length] = new nlobjSearchColumn('custrecordhtitemskidqty_heattreatedskid', 'custrecordhtitemskidqty_item');
		
		var itemResults = nlapiSearchRecord('item', null, itemFilters, itemCols);	
		
		// find the series and tank type of the item to pass in via the customer filters
		var seriesId = null;
		var tankTypeId = null;
		
		if (itemResults != null && itemResults.length > 0)
		{
			seriesId = itemResults[0].getValue('custitemhttankseries');
			tankTypeId = itemResults[0].getValue('custitemhttanktype');
		}
		
		var customerResults = null;
		
		// if there isn't a customer then we can't do the customer results
		if (customerId != "" && customerId != 0)
		{
			// get the customer skid quantity info
			// do a search to get the customer information with customer skid quantity data
			var customerFilters = new Array();
			customerFilters[customerFilters.length] = new nlobjSearchFilter('internalid', null, 'is', customerId, null);
			
			var customerCols = new Array();
			customerCols[customerCols.length] = new nlobjSearchColumn('custentityht_skidquantitygroup');
			customerCols[customerCols.length] = new nlobjSearchColumn('custentityht_requiresheattreatedskid');
			customerCols[customerCols.length] = new nlobjSearchColumn('internalid', 'custrecordhtcustskidqty_customer');
			customerCols[customerCols.length] = new nlobjSearchColumn('custrecordhtcustskidqty_series', 'custrecordhtcustskidqty_customer');
			customerCols[customerCols.length] = new nlobjSearchColumn('custrecordhtcustskidqty_tanktype', 'custrecordhtcustskidqty_customer');
			customerCols[customerCols.length] = new nlobjSearchColumn('custrecordhtcustskidqty_item', 'custrecordhtcustskidqty_customer');
			customerCols[customerCols.length] = new nlobjSearchColumn('custrecordhtcustskidqty_skiditem', 'custrecordhtcustskidqty_customer');
			customerCols[customerCols.length] = new nlobjSearchColumn('custrecordhtcustskidqty_quantity', 'custrecordhtcustskidqty_customer');
			
			customerResults = nlapiSearchRecord('customer', null, customerFilters, customerCols);
			
			nlapiLogExecution('debug', 'customerResults', customerResults);
		}
		
		var quantityFound = false;
		
		// now loop through the results and see if there is a match for this item and this skid
		if (customerResults != null && customerResults.length > 0)
		{
			for (var i=0; i<customerResults.length; i++)
			{
				// first look and see if there is a item-specific line for this item and skid item
				if (	customerResults[i].getValue('custrecordhtcustskidqty_item', 'custrecordhtcustskidqty_customer') == itemId && 
						customerResults[i].getValue('custrecordhtcustskidqty_skiditem', 'custrecordhtcustskidqty_customer') == skidItemId)
				{
					obj.quantity = ConvertNSFieldToNullableInt(customerResults[i].getValue('custrecordhtcustskidqty_quantity', 'custrecordhtcustskidqty_customer'), false);
					quantityFound = true;
					
					break;
				}
			}
			
			// if we couldn't find an item-specific one, look for one where the tank type and series are set
			if (!quantityFound)
			{
				for (var i=0; i<customerResults.length; i++)
				{
					if (	customerResults[i].getValue('custrecordhtcustskidqty_series', 'custrecordhtcustskidqty_customer') == seriesId && 
							customerResults[i].getValue('custrecordhtcustskidqty_tanktype', 'custrecordhtcustskidqty_customer') == tankTypeId && 
							customerResults[i].getValue('custrecordhtcustskidqty_skiditem', 'custrecordhtcustskidqty_customer') == skidItemId
							)
					{
						obj.quantity = ConvertNSFieldToNullableInt(customerResults[i].getValue('custrecordhtcustskidqty_quantity', 'custrecordhtcustskidqty_customer'), false);
						quantityFound = true;
						
						break;
					}
				}
			}
			
			// if we still don't have one set, then look for any record where the series is set but the tank type isn't and see if that matches
			if (!quantityFound)
			{
				for (var i=0; i<customerResults.length; i++)
				{
					if (	customerResults[i].getValue('custrecordhtcustskidqty_series', 'custrecordhtcustskidqty_customer') == seriesId && 
							customerResults[i].getValue('custrecordhtcustskidqty_tanktype', 'custrecordhtcustskidqty_customer') == '' && 
							customerResults[i].getValue('custrecordhtcustskidqty_skiditem', 'custrecordhtcustskidqty_customer') == skidItemId)
					{
						obj.quantity = ConvertNSFieldToNullableInt(customerResults[i].getValue('custrecordhtcustskidqty_quantity', 'custrecordhtcustskidqty_customer'), false);
						quantityFound = true;
						
						break;
					}
				}
			}
			
			// if we don't have one set, then there must not be a customer-specific one
			// so look in the item results for a line with a matching skid item
			// also look for an item result line where the skid item is the heat treated skid and the customer requires a heat treated skid
			if (!quantityFound)
			{
				var requiresHeatTreatedSkid = customerResults[0].getValue('custentityht_requiresheattreatedskid');
				
				for (var i=0; i<itemResults.length; i++)
				{
					if (	itemResults[i].getValue('custrecordhtitemskidqty_skiditem', 'custrecordhtitemskidqty_item') == skidItemId || 
							(itemResults[i].getValue('custrecordhtitemskidqty_heattreatedskid', 'custrecordhtitemskidqty_item') == skidItemId && requiresHeatTreatedSkid == 'T'))
					{
						obj.quantity = ConvertNSFieldToNullableInt(itemResults[i].getValue('custrecordhtitemskidqty_quantity', 'custrecordhtitemskidqty_item'), false);
						quantityFound = true;
					}
				}
			}
		}
	}
	
	return obj;
}

/**
 * An implementation of a hashtable object.
 */
function HashTable() 
{
    this.length = 0;
    this.items = new Array();
    for (var i = 0; i < arguments.length; i += 2) {
        if (typeof (arguments[i + 1]) != 'undefined') {
            this.items[arguments[i]] = arguments[i + 1];
            this.length++;
        }
    }

    this.removeItem = function (in_key) {
        var tmp_previous;
        if (typeof (this.items[in_key]) != 'undefined') {
            this.length--;
            var tmp_previous = this.items[in_key];
            delete this.items[in_key];
        }

        return tmp_previous;
    }

    this.getItem = function (in_key) {
        return this.items[in_key];
    }

    this.setItem = function (in_key, in_value) {
        var tmp_previous;
        if (typeof (in_value) != 'undefined') {
            if (typeof (this.items[in_key]) == 'undefined') {
                this.length++;
            } else {
                tmp_previous = this.items[in_key];
            }

            this.items[in_key] = in_value;
        }

        return tmp_previous;
    }

    this.hasItem = function (in_key) {
        return typeof (this.items[in_key]) != 'undefined';
    }

    this.clear = function () {
        for (var i in this.items) {
            delete this.items[i];
        }

        this.length = 0;
    }
}

/**
 * Returns possibly >1000 search results for the specified search type, filters, and columns.
 * 
 * @param {String} type Record type to search on
 * @param {Array} filters Array of nlobjsearchfilters (or just a single filter) 
 * @param {Array} columns Array of nlobjSearchColumns (or just a single column)
 * @param {String} savedSearchId - Id of the saved search. If this is specified and type is not known (i.e, it is a saved search of un-scriptable record), pass type as null.
 * @returns {Array}
 */
function GetSteppedSearchResults(type, filters, columns, savedSearchId)
{
	var itemResultsFinal = [];
	var search = null;
	if(savedSearchId != undefined && savedSearchId != null)
	{
		search = nlapiLoadSearch(type, savedSearchId);
		
		if(filters != null)
		{
			if(filters.length == undefined) //must be a single nlobjSearchFilter object.
				search.addFilter(filters);
			else if(filters.length > 0)
				search.addFilters(filters);
		}
					
		if(columns != null)
		{
			if(columns.length == undefined) //must be a single nlobjSearchColumn object
				search.addColumn(columns);
			else if(columns.length > 0)
				search.addColumns(columns);
		}			
	}
	else
		search = nlapiCreateSearch(type, filters, columns);
	
	var searchResults = search.runSearch();
	var resultIndex = 0; var resultStep = 1000;
	var resultSet; //loop variable to hold the 1000s of results.
	do 
	{
		if(nlapiGetContext().getRemainingUsage() < 50)
			nlapiYieldScript();
		
	    //fetch one result set
		//If we don't get search results, concat an empty array. This will make it so we don't add null items to the array.
	    resultSet = searchResults.getResults(resultIndex, resultIndex + resultStep) || [];
	    itemResultsFinal = itemResultsFinal.concat(resultSet);
	    
	    //increase the low index by the step.
	    resultIndex = resultIndex + resultStep;
	} while (resultSet != null && resultSet.length > 0);
		
	return itemResultsFinal;
}