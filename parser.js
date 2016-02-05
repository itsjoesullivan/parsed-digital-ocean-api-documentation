/*
   documentation parser... needs some love wrt readability
*/
var cheerio = require('cheerio');
var fs = require('fs');
var camel = require('to-camel-case');

var $ = cheerio.load(fs.readFileSync('./12-15-2016.html', 'binary'));

// also write documentation at this time
var mdName = __dirname + '/../digital-ocean-api-v2/methods.md'
fs.writeFileSync(mdName, '', 'binary');

var categoryArray = [];
$("nav.sidebar > ul > li").each(function(i, el) { // for each category in the sidebar
  var categoryObj = {};
  var objName = $(el).find("> a").first().text();

  // convert category name to camel case, but make IP all caps
  categoryObj.name = camel(objName)
    .replace(/Ip/g, 'IP');

  // skip introduction
  if (categoryObj.name === "introduction") {
    return;
  }

  // this item isn't parsable :(
  if (categoryObj.name === "account") {
    categoryArray.push({
      name: "account",
      items: [{
        name: "getUserInformation",
        path: "/v2/account",
        method: "GET",
        requiredResourceIdCount: 0,
        properties: [],
        staticProperties: {}
      }]
    });
    fs.appendFileSync(mdName, "\n###" + "account" + "\n", 'binary');
    fs.appendFileSync(mdName, "- [" + "getUserInformation" + "](" + "https://developers.digitalocean.com/documentation/v2/#get-user-information" + ")\n", 'binary');
    fs.appendFileSync(mdName, "\n`" + "api.account.getUserInformation" + "`\n", 'binary');
    return;
  }

  fs.appendFileSync(mdName, "\n###" + categoryObj.name + "\n", 'binary');
  categoryObj.items = [];

  $(el).find('> ul > li > a').each(function(i, vel) { // for each action in the category
    var href = $(vel).attr('href');
    var linkUrl = "https://developers.digitalocean.com/documentation/v2" + href;


    // grab the main content for the action
    var $actionEl = $(href)
    var name = $actionEl.find('h3').first().text();
    var path = $actionEl.find('p').first().find('code').first().text();
    var methodExec = /(GET|DELETE|PUT|POST|HEAD)/.exec($actionEl.find('p').first().text());
    if (!methodExec) {
      return;
    }
    var method = methodExec[1];
    var itemObj = {
      name: camel(name
              .replace(/(a |an |the )/ig, '') // strip out a / an / the
            ).replace(/Ip/g, 'IP'), // again, IP
      path: path,
      method: method
    };
    if (itemObj.name === "deleteFloatingIPs") { // one-off for this typo
      itemObj.name = "deleteFloatingIP";
    }
    fs.appendFileSync(mdName, "- [" + itemObj.name + "](" + linkUrl + ")\n", 'binary');

    // determine how many id arguments are needed
    itemObj.requiredResourceIdCount = itemObj.path.split("$").length - 1;

    // generate signature for documentation
    var signature = "api." + categoryObj.name + "." + itemObj.name + "("
    var signatureArgs = "";
    if (itemObj.requiredResourceIdCount > 0) {
      signatureArgs = itemObj.path.split('/').reduce(function(arr, item) {
        if (/^\$/.test(item)) {
          arr.push(camel(item.replace(/\$/, 'A')).substring(1));
        }
        return arr;
      }, []).join(', ') + ', ';
      signature += signatureArgs;
    }
    signature += "options)";
    if (itemObj.method === "GET" || itemObj.method === "DELETE") {
      signature = signature.replace(', options', '');
    }
    fs.appendFileSync(mdName, "\n`" + signature + "`\n", 'binary');

    // parse properties, including required and static
    itemObj.properties = [];
    itemObj.staticProperties = {};
    var log = false;
    $actionEl.find('tbody').first().find('tr').each(function(i, el) {
      var row = $(el);
      if (row.find('td').length === 4) {
        var propObj = {};
        propObj = {
          name: $(row.find('td')[0]).text(),
          type: $(row.find('td')[1]).text(),
          required: $(row.find('td')[3]).text().toLowerCase().indexOf('true') !== -1
        };
        itemObj.properties.push(propObj);
        if (/Must be (\w+)$/.test($(row.find('td')[2]).text())) {
          itemObj.staticProperties[propObj.name] = /Must be (\w+)$/.exec($(row.find('td')[2]).text())[1];
        }
      }
    });
    if (itemObj.name === "assignFloatingIPToDroplet") {
      // assignFloatingIPToDroplet documentation is odd
      itemObj.staticProperties["type"] = "assign";
    } else if (itemObj.name === "unassignFloatingIP") {
      // assignFloatingIPToDroplet documentation is odd
      itemObj.staticProperties["type"] = "unassign";
    }
    categoryObj.items.push(itemObj);
  });
  if (categoryObj.items.length) {
    categoryArray.push(categoryObj);
  }
});
console.log(JSON.stringify(categoryArray, null, 2));
