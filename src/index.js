
import * as dscc from '@google/dscc'

import { scaleOrdinal } from "d3-scale";
import * as fmt from "d3-format";
import { partition, hierarchy } from "d3-hierarchy";
import { arc } from "d3-shape";
import { transition } from "d3-transition";
import * as arr from "d3-array";
import { rgb } from "d3-color";
import { select, selectAll } from 'd3-selection';
import { schemeSet1 } from "d3-scale-chromatic";

const d3 = Object.assign(
  {},
  {
    scaleOrdinal,
    select,
    selectAll,
    rgb,
    arc,
    partition,
    hierarchy,
    transition,
    schemeSet1
  },
  fmt,
  arr
)

var margin = { top: 10, right: 10, bottom: 10, left: 10 }
var width, height, radius;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
  w: 75, h: 30, s: 3, t: 10
};

var totalSize = 0; // total of primary goal
var path_size = 0; // total of goal in segment
var tot_value, path_value = 0;
var cats = []; // unique categories
var goal_name; // get primary goal name from the fields
var goal_name_secondary; // secondary goal 
var valuekiloFormat = d3.format(".3s")
var valueFormat = d3.format(".0f")

function drawViz(data) {
  var dataByConfigId = data.tables.DEFAULT;
  var fieldsByConfigId = data.fields;
  var styleByConfigId = data.style; // add when time :-)
  goal_name = fieldsByConfigId.goals[0].name.toLowerCase() // primary goal
  // if two goals add it
  goal_name_secondary = fieldsByConfigId.goals.length == 2 ? fieldsByConfigId.goals[1].name.toLowerCase() : undefined;
  // obtain the height and width to scale your visualization appropriately
  var rect_base = Math.min(document.documentElement.clientHeight, dscc.getWidth())
  height = rect_base - margin.top - margin.bottom;
  width = rect_base - margin.left - margin.right;
  radius = Math.min(width, height) / 2;

  d3.select('body')
    .selectAll('svg')
    .remove();

  d3.select('body')
    .selectAll('#explanation')
    .remove();

  var div_data = [
    { "id": "sequence", "height": b.h, "width": dscc.getWidth() },
    { "id": "chart", "height": (Math.min(width, height) + margin.top + margin.bottom - b.h), "width": (Math.min(width, height) + margin.left + margin.right) }
  ]

  var grid = d3.select("body")
    .selectAll('div')
    .data(div_data).enter()
    .append('div')
    .attr('id', function (d) { return d.id })
    .attr('style', function (d) { return 'height: ' + d.height + 'px; width: ' + d.width + 'px;' })

  var parsedData = dataByConfigId.map(function (d) {
    return {
      path_sequence: d['sequences'][0],
      goal1: +d.goals[0],
      goal2: +d.goals[1]
    };
  });
  var seq_hierarchy = buildHierarchy(parsedData);
  cats = [...new Set(cats.map(item => item))]; // reduce to unique categories
  createVisualization(seq_hierarchy);
}

function createVisualization(json) {

  var myColor = d3.scaleOrdinal()
    .domain(cats)
    .range(d3.schemeSet1);

  var vis = d3.select("#chart")
    .append("svg:svg")
    .attr("width", (Math.min(width, height) + margin.left + margin.right))
    .attr("height", (Math.min(width, height) + margin.top + margin.bottom - b.h))
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + (Math.min(width, height) + margin.left) / 2 + "," + (Math.min(width, height) + margin.top - b.h) / 2 + ")");

  var partition = d3.partition()
    .size([2 * Math.PI, radius * radius]);

  var arc = d3.arc()
    .startAngle(function (d) { return d.x0; })
    .endAngle(function (d) { return d.x1; })
    .innerRadius(function (d) { return Math.sqrt(d.y0); })
    .outerRadius(function (d) { return Math.sqrt(d.y1); });

  initializeBreadcrumbTrail();
  //drawLegend();

  // Bounding circle underneath the sunburst, to make it easier to detect
  // when the mouse leaves the parent g.
  vis.append("svg:circle")
    .attr("r", radius)
    .style("opacity", 0);

  // Turn the data into a d3 hierarchy and calculate the sums.
  var root = d3.hierarchy(json)
    .sum(function (d) { return d.size; })
    .sort(function (a, b) { return b.value - a.value; });

  // For efficiency, filter nodes to keep only those large enough to see.
  var nodes = partition(root).descendants()
    .filter(function (d) {
      return (d.x1 - d.x0 > 0.005); // 0.005 radians = 0.29 degrees
    });

  var path = vis.data([json]).selectAll("path")
    .data(nodes)
    .enter().append("svg:path")
    .attr("display", function (d) { return d.depth ? null : "none"; })
    .attr("d", arc)
    .attr("fill-rule", "evenodd")
    .style("fill", function (d) { return myColor(d.data.name); })
    .style("opacity", 1)
    .on("mouseover", mouseover);

  // Add the mouseleave handler to the bounding circle.
  d3.select("#container").on("mouseleave", mouseleave);

  // Get total size of the tree = value of root node from partition.
  totalSize = path.datum().value;

  drawText({ select: ".pct", o_class: "pct", fontsize: "3em", text: valuekiloFormat(totalSize), y_corr: 2.2 });
  drawText({
    select: ".exp",
    o_class: "exp",
    fontsize: "1.1em",
    text: goal_name + ' in all paths',
    y_corr: 2
  });
  drawText({
    select: ".exp",
    o_class: "exp",
    fontsize: "1.1em",
    text: goal_name_secondary,
    y_corr: 1.9
  });
  
  var all_sum;
  function mouseover(d) {
    // legend toggle on config
    // font size on style settings
    // three predefined color schemes, one custom and 
    // clean the width heigth shit
    function arraySum(obj) {
      var all_sum = 0;
        if(Array.isArray(obj.children)) {
            for(let i=0; i<obj.children.length; i++) {
                all_sum += arraySum(obj.children[i])
            }
        } else if (typeof obj.cvalue === 'number') {
          all_sum += obj.cvalue;
          //console.log(all_sum)
      }
      return all_sum;
    }
    var percFormat = d3.format(".2%")
    var percentage = d.value / totalSize;
    var percentageString = percFormat(percentage);
    if (percentage < 0.001) {
      percentageString = "< 0.1%";
    }
    
    path_value = valuekiloFormat(arraySum(d.data));
    if (d.value > 1000) {
      path_size = valuekiloFormat(d.value);
    } else {
      path_size = valueFormat(d.value)
    }

    d3.selectAll('.pct')
      .remove()
    d3.selectAll('.exp')
      .remove()
    drawText({ select: ".pct", o_class: "pct", fontsize: "3em", text: path_size, y_corr: 2.2 });
    drawText({
      select: ".exp",
      o_class: "exp",
      fontsize: "1.1em",
      text: percentageString + ' of ' + goal_name +', ' + path_value + ' €',
      y_corr: 2
    });
    drawText({
      select: ".exp",
      o_class: "exp",
      fontsize: "1.1em",
      text: 'in this path sequence',
      y_corr: 1.9
    });

    var sequenceArray = d.ancestors().reverse();
    sequenceArray.shift(); // remove root node from the array
   // console.log(sequenceArray);
    updateBreadcrumbs(sequenceArray, path_size + " " + goal_name);

    // Fade all the segments.
    d3.selectAll("path")
      .style("opacity", 0.3);

    // Then highlight only those that are an ancestor of the current segment.
    vis.selectAll("path")
      .filter(function (node) {
        return (sequenceArray.indexOf(node) >= 0);
      })
      .style("opacity", 1);
  }

  // Restore everything to full opacity when moving off the visualization.
  function mouseleave(d) {
    // Hide the breadcrumb trail
    d3.select("#trail")
      .style("visibility", "hidden");

    // Deactivate all segments during transition.
    d3.selectAll("path").on("mouseover", null);
    d3.selectAll('.pct')
      .remove()
    d3.selectAll('.exp')
      .remove()
    drawText({ select: ".pct", o_class: "pct", fontsize: "3em", text: valuekiloFormat(totalSize), y_corr: 2.2 });
    drawText({ select: ".exp", o_class: "exp", fontsize: "1.1em", text: goal_name + ' in all paths', y_corr: 2 });

    // Transition each segment to full opacity and then reactivate it.
    d3.selectAll("path")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .on("end", function () {
        d3.select(this).on("mouseover", mouseover);
      });

  }


  function initializeBreadcrumbTrail() {
    // Add the svg area.
    var trail = d3.select("#sequence").append("svg:svg")
      .attr("width", dscc.getWidth())
      .attr("height", 50)
      .attr("id", "trail");
    // Add the label at the end, for the percentage.
    trail.append("svg:text")
      .attr("id", "endlabel")
      .style("fill", "#000");
  }

  // Generate a string that describes the points of a breadcrumb polygon.
  function breadcrumbPoints(d, i) {
    var points = [];
    points.push("0,0");
    points.push(b.w + ",0");
    points.push(b.w + b.t + "," + (b.h / 2));
    points.push(b.w + "," + b.h);
    points.push("0," + b.h);
    if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
      points.push(b.t + "," + (b.h / 2));
    }
    return points.join(" ");
  }

  // Update the breadcrumb trail to show the current sequence and percentage.
  function updateBreadcrumbs(nodeArray, percentageString) {

    // Data join; key function combines name and depth (= position in sequence).
    var trail = d3.select("#trail")
      .selectAll("g")
      .data(nodeArray, function (d) { return d.data.name + d.depth; });

    // Remove exiting nodes.
    trail.exit().remove();

    // Add breadcrumb and label for entering nodes.
    var entering = trail.enter().append("svg:g");

    entering.append("svg:polygon")
      .attr("points", breadcrumbPoints)
      .style("fill", function (d) { return myColor(d.data.name); });

    entering.append("svg:text")
      .attr("x", (b.w + b.t) / 2)
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function (d) { return d.data.name; });

    // Merge enter and update selections; set position for all nodes.
    entering.merge(trail).attr("transform", function (d, i) {
      return "translate(" + i * (b.w + b.s) + ", 0)";
    });

    // Now move and update the percentage at the end.
    d3.select("#trail").select("#endlabel")
      .attr("x", (nodeArray.length + 0.2) * (b.w + b.s))
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "start")
      .style('fill', "#666666")
      .text(percentageString);

    // Make the breadcrumb trail visible, if it's hidden.
    d3.select("#trail")
      .style("visibility", "");

  }
};

function drawText(params) {
  d3.select("#chart > svg")
    .append('text')
    .attr('class', params.o_class)
    .attr("text-anchor", "middle")
    .attr("font-size", params.fontsize)
    .text(params.text)
    .attr('x', (Math.min(width, height) + margin.left) / 2)
    .attr('y', (Math.min(width, height) + margin.top + b.h) / params.y_corr)
}
// Fade all but the current sequence, and show it in the breadcrumb trail.
function drawLegend() {

  // Dimensions of legend item: width, height, spacing, radius of rounded rect.
  var li = {
    w: 75, h: 30, s: 3, r: 3
  };

  var legend = d3.select("#legend").append("svg:svg")
    .attr("width", li.w)
    .attr("height", d3.keys(colors).length * (li.h + li.s));

  var g = legend.selectAll("g")
    .data(d3.entries(colors))
    .enter().append("svg:g")
    .attr("transform", function (d, i) {
      return "translate(0," + i * (li.h + li.s) + ")";
    });

  g.append("svg:rect")
    .attr("rx", li.r)
    .attr("ry", li.r)
    .attr("width", li.w)
    .attr("height", li.h)
    .style("fill", function (d) { return d.value; });

  g.append("svg:text")
    .attr("x", li.w / 2)
    .attr("y", li.h / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .text(function (d) { return d.key; });
}

function buildHierarchy(parsedData) {
  var root = { "name": "root", "children": [] };
  for (var i = 0; i < parsedData.length; i++) {
    var sequence = parsedData[i]['path_sequence'];
    var regex = / [Ss]earch/gi;
    sequence = sequence.replace(regex, '')
    var size = +parsedData[i]['goal1'];
    // add if secondary goal defined
    if (goal_name_secondary !== undefined) {
      var value_secondary = + +parsedData[i]['goal2']
    }
    var parts = sequence.split(" > ");
    parts.push("end")
    // push uniques to cats
    let un_cats = [...new Set(parts.map(item => item))];
    cats = cats.concat(un_cats)
    var currentNode = root;

    if (parts.length <= 7) {
      for (var j = 0; j < parts.length; j++) {
        var children = currentNode["children"];
        var nodeName = parts[j];
        var childNode;
        if (j + 1 < parts.length) {
          // Not yet at the end of the sequence; move down the tree.
          var foundChild = false;
          for (var k = 0; k < children.length; k++) {
            if (children[k]["name"] == nodeName) {
              childNode = children[k];
              foundChild = true;
              break;
            }
          }
          // If we don't already have a child node for this branch, create it.
          if (!foundChild) {
            childNode = { "name": nodeName, "children": [] };
            //console.log(childNode)
            children.push(childNode);
          }
          currentNode = childNode;
        } else {
          // Reached the end of the sequence; create a leaf node.
          if (goal_name_secondary !== undefined) {
            childNode = { "name": nodeName, "size": size, "cvalue": value_secondary };
          } else {
            childNode = { "name": nodeName, "size": size };
          }
          children.push(childNode);
        }
      }
    }
  }
  //}
  return root;
};
// call drawViz every time Data Studio sends a new postMessage
dscc.subscribeToData(drawViz, { transform: dscc.objectTransform });