# gds-sequences-viz

Visualize eg Google Analytics top paths data in Google Datastudio (GDS).
This experimental visualization done with d3.js (v5) and inpired by many 
examples in blockbuilder.org and especially this https://blockbuilder.org/63anp3ca/578bd52d368d452f64ab08d10a5f1a49  

Demo of viz: https://datastudio.google.com/open/18WWPPOz6SF--NEVVBkwQEC0CK3EDZ-Lu  
Component ID: gs://path-sequence-viz  

In GDS you can choose upto 2 metrics (goals) to be visualized in sequence paths.  
The dimension currently works only with GA's format where sequences are separated with `" > "`  

TODO:  

- add option to select depth of paths to be shown (now fixed to 6 plus end node)  
- DONE: add style configurations: base font, font-size  
- DONE: add color schemes selection  
- DONE: fix suboptimal size (svg width and height)  
- PARTLY DONE: clean up messy code  
- add build scripts for development and production separately  
- DONE: add legend toggle to style configuration