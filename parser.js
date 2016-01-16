/*
   documentation parser... needs some love wrt readability
*/
var cheerio = require('cheerio');
var fs = require('fs');
var camel = require('to-camel-case');
var $ = cheerio.load(fs.readFileSync('./12-15-2016.html', 'binary'));

var mdName = __dirname + '/../methods.md'

fs.writeFileSync(mdName, '', 'binary');

var items = [];
$("nav.sidebar > ul > li").each(function(i, el) {
  var obj = {};
  var objName = $(el).find("> a").first().text();
  obj.name = camel(objName).replace(/Ip/g, 'IP');
  if (obj.name === "introduction") {
    return;
  }
  if (obj.name === "account") {
    // not parseable here
    return;
  }
  fs.appendFileSync(mdName, "\n###" + obj.name + "\n", 'binary');
  obj.items = [];
  $(el).find('> ul > li > a').each(function(i, vel) {
    var href = $(vel).attr('href');
    var linkUrl = "https://developers.digitalocean.com/documentation/v2" + href;
    var $thing = $(href)
    var name = $thing.find('h3').first().text();
    var path = $thing.find('p').first().find('code').first().text();
    var methodExec = /(GET|DELETE|PUT|POST|HEAD)/.exec($thing.find('p').first().text());
    if (!methodExec) {
      return;
    }
    var method = methodExec[1];
    var itemObj = {
      name: camel(name.replace(/(a |an |the )/ig, '')).replace(/Ip/g, 'IP'),
      path: path,
      method: method
    };
    if (itemObj.name === "deleteFloatingIPs") {
      itemObj.name = "deleteFloatingIP";
    }
    fs.appendFileSync(mdName, "- [" + itemObj.name + "](" + linkUrl + ")\n", 'binary');
    itemObj.requiredResourceIdCount = itemObj.path.split("$").length - 1;
    var signature = "api." + obj.name + "." + itemObj.name + "("
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
    fs.appendFileSync(mdName, "\n`" + signature + "`\n", 'binary');
    itemObj.requiredProperties = [];
    itemObj.staticProperties = {};
    var log = false;
    $thing.find('tbody').first().find('tr').each(function(i, el) {
      var row = $(el);
      if (row.find('td').length === 4) {
        var propObj = {};
        propObj = {
          name: $(row.find('td')[0]).text(),
          type: $(row.find('td')[1]).text(),
          required: $(row.find('td')[3]).text().toLowerCase().indexOf('true') !== -1
        };
        itemObj.requiredProperties.push(propObj);
        if (/Must be (\w+)$/.test($(row.find('td')[2]).text())) {
          itemObj.staticProperties[propObj.name] = /Must be (\w+)$/.exec($(row.find('td')[2]).text())[1];
        }
      }
    });
    obj.items.push(itemObj);
  });
  if (obj.items.length) {
    items.push(obj);
  }
});
console.log(JSON.stringify(items, null, 2));
