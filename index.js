String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

//debounce function
function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

// dictionary for xAxis labels on the barchart

var xLabels = {'White':'White','African_American':'African A.','American_Indian':'A. Indian','Asian':'Asian',
     'Native_Hawaiian':'Hawaiian','Other':'Other','Two_or_More_Races':'2 or More','Hispanic':'Hispanic'}

//dictionary for input input labels
var borough_dict = {"Brooklyn":"Brooklyn","Manhattan":"Manhattan","Queens":"Queens","StatenIsland":"Staten Island","Bronx":"The Bronx","ALL":'ALL'}
var borough_title_dict = {"BROOKLYN":"BROOKLYN","MANHATTAN":"MANHATTAN","QUEENS":"QUEENS","STATENISLAND":"STATEN ISLAND","BRONX":"THE BRONX","ALL":'NEW YORK CITY', "NEW YORK CITY":"NEW YORK CITY"}
//class for making a treemapdata
function nestData(data){

  const nestedData = d3.nest()
                       .key((d) =>{return d.borough})
                       .key((d) =>{return d.name})
                       .key((d) =>{return d.demographic})
                       .entries(data)

  return nestedData;;
}



d3.csv("New_York_Neighborhood_Demo.csv", (d)=>{
         return {
           Borough:d.Borough,
           'FIPS': d['FIPS'],
           code:d.code,
           name:d.name,
           demographics:{
           total_population:parseInt(d.total_population),
           White:parseInt(d.White),
           African_American:parseInt(d.African_American),
           American_Indian:parseInt(d.American_Indian),
           Asian:parseInt(d.Asian),
           Native_Hawaiian:parseInt(d.Native_Hawaiian_and_Other_Pacific_Islander),
           Other:parseInt(d.Other),
           Two_or_More_Races:parseInt(d.Two_or_More_Races),
           Hispanic:parseInt(d.Hispanic_Origin)
         }
           }
       })
        .then((data)=>{

            //have to get rid of airport as no one live there and it throws a bug in the visualization
            data = data.filter((d,i)=>{
              return d.name != 'Airport';
            })
          //these two variables get all the neighborhood names one as an array of dictionaries the other as dict by borough
            var neighborhood_names = [];
            var nieghborhood_borough_names = {"Brooklyn":[],"Manhattan":[],"Queens":[],"StatenIsland":[],"Bronx":[],"ALL":neighborhood_names}
            var borough_list =["ALL","Brooklyn","Manhattan","Queens","StatenIsland","Bronx"];
            var neighborhood_dict ={}

             tree_data = data.reduce((a,val)=>{

                  neighborhood_names.push({name:val.name, borough:val.Borough});
                  nieghborhood_borough_names[val.Borough].push({name:val.name});
                  neighborhood_dict[val.name]=val.Borough;

                  let currentArray =[];

                  Object.keys(val.demographics).forEach((demo)=>{
                    if(demo != "total_population"){
                    currentArray.push({borough:val.Borough, 'FIPS':val['FIPS'], code:val.code, name:val.name, demographic:demo, value:val.demographics[demo]})
                     }
                  })

                  return a.concat(currentArray);
             },[])


            const nestedData = {key:'New York City',
                                    values:nestData(tree_data)};

            const root = d3.hierarchy(nestedData, (d)=>{return d.values;})

          

            nieghborhood_borough_names['StatenIsland']=nieghborhood_borough_names['StatenIsland'].filter(function(val){
              return val.name != 'park-cemetery-etc-StatenIsland';
            })

            neighborhood_names = neighborhood_names.filter(function(val){
              return val.name != 'park-cemetery-etc-StatenIsland';
            })




             const treemap =new Treemap({element:document.querySelector("#treemap-container"), data:nestedData});
                   treemap.draw();

            //barchart
               //grouping and reducing




          var  demo_all_data = groupAll(tree_data);



          const barchart = new Bar({data:demo_all_data,title:{main:'New York City',sub:'All Neighborhoods'},contEl:document.querySelector("#bar-chart-container"),colorScale:treemap.getColorScale()});
                barchart.draw()

        //sort neighborhoood names alphebettacly for easeir use in the form fields
           neighborhood_names=neighborhood_names.sort((a,b)=>{
             if(a.name < b.name) { return -1; }
              if(a.name > b.name) { return 1; }
              return 0;
            })

            neighborhood_names=[{name:'ALL',borough:'ALL'}].concat(neighborhood_names);

            Object.keys(nieghborhood_borough_names).forEach((key)=>{
              nieghborhood_borough_names[key] = nieghborhood_borough_names[key].sort((a,b)=>{
                 if(a.name < b.name) { return -1; }
                 if(a.name > b.name) { return 1; }
                 return 0;
               });
             nieghborhood_borough_names[key]= [{name:'ALL'}].concat(nieghborhood_borough_names[key]);
          })



            const barform = new BarForm({bourough_names:borough_list, contEl: document.querySelector('#bar-chart-form'),neighborhood_names:neighborhood_names,nieghborhood_borough_names:nieghborhood_borough_names })
                  barform.render();

                  //setTimeout(function(){ barform.rerender({borough:'Queens', neighborhood:'Astoria'})},5000);
            //this function will strictly handle the onchange when the inputs are changed this allows one to re apply onchange events after ever rerender

            function change(){
              changeBorough()
              changeNHood();


            }

            // this function is for when the borough is changed

            function changeBorough(){


            d3.selectAll('.borough-select').on('change',function(datum){

               //these changes are for rerendering the input
               const value = d3.select(this).node().value;
               const data  = d3.select('#'+value+'-id').data();
               const boroughs_neighborhoods = nieghborhood_borough_names[data[0]]

               barform.rerender({borough:data[0], neighborhood:'ALL',neighborhood_names:boroughs_neighborhoods})
               change()
                var  demo_all_data = groupAll(tree_data);
                const new_bar_data =data[0]=='ALL'?demo_all_data:groupBorough(tree_data,data[0]);

                 const title ={};
                       title.main = data[0]=='ALL'?"NEW YORK CITY":data[0].toUpperCase();

                barchart.update({data:new_bar_data, title:{main:title.main,sub:'All Neighborhoods'}})


            })


            }


            //this function is for when the neighborhood is changed
            function changeNHood(){
              d3.selectAll('.neighborhood-select').on('change',function(datum){

                 //these changes are for rerendering the input
                 let value = d3.select(this).node().value;
                     value = value.replace("(","");
                     value = value.replace(")","");
                     value = value.replace("(","");
                     value = value.replace(")","");
                     value = value.replace(".","");
                     value = value.replace(".","");
                     value = value.replace("'","");
                     value = value.replace("'","");
                 const data  = d3.select('#'+value+'-id').data();


                if(value==='ALL'){
                  if(d3.select('.borough-select').node().value ==='ALL'){
                    var new_bar_data = groupAll(tree_data);
                  }else{
                   const borough = d3.select('.borough-select').node().value;
                   var new_bar_data = groupBorough(tree_data,borough);
                 }
                }else{

                 var new_bar_data = groupNeighborhood(tree_data,data[0].name);
                  }

                  const title ={};
                        title.main = data[0] =='ALL'? d3.select('.borough-select').node().value== 'ALL'?"NEW YORK CITY":d3.select('.borough-select').node().value:neighborhood_dict[data[0].name];

                        title.sub = data[0] =='ALL'?'ALL NEIGHBORHOODS':data[0].name;


                 barchart.update({data:new_bar_data,title:{main:title.main,sub:title.sub}})

               })

            }

            change(nieghborhood_borough_names);


            //treemap on click event

         function onClick(){
            treemapClick()


         }

         function treemapClick(){

          const clickFunction = function(){
            const name = d3.select(this).data()[0].data.name;


            const new_bar_data = groupNeighborhood(tree_data,name);
            barchart.update({data:new_bar_data,title:{main:neighborhood_dict[name],sub:name}})




              barform.rerender({borough:neighborhood_dict[name], neighborhood:name, neighborhood_names:nieghborhood_borough_names[neighborhood_dict[name]] })
              //since we re render the select options we have to re re bind change events for them
              change();
          }

           d3.selectAll('.tree-rect-leaves').on('click',clickFunction);
           d3.selectAll('.treemap-text-label').on('click',clickFunction);
         }
          //on click for treemap
           onClick()

        //on hover for treemap
           mousevents();

      //onoff for neighborhood Labels
      clickChange()

        //redraw charts on resize

          var resizeFunction = debounce(function() {
                treemap.rerender();
                barchart.rerender();
                onClick()

             //on hover for treemap
                mousevents();



              }, 250);
          window.addEventListener('resize', resizeFunction);
               });

//Treemap class

  class Treemap {
       constructor(opts){
         this.data = opts.data;
         this.contEl = opts.element;




       }

      draw(){
        this.margin ={t:35,r:35,b:135,l:35}
        this.width = this.contEl.offsetWidth-(this.margin.l+this.margin.r);
        this.height = this.width;
        this.contEl.innerHTML ="";
        this.svg = d3.select(this.contEl)
                      .append('svg')
                      .attr('class', 'static-main-svg')
                      .attr('height', this.height+(this.margin.l+this.margin.r))
                      .attr('width', this.width+(this.margin.l+this.margin.r))





        this.setTreeMap();
        this.makeScale();
        this.drawleaves();
        this.drawTitles();
        this.drawLabels();
        this.drawOnOff();




       }


       setTreeMap(){
         const treemap = this.treemap(this.data, this.width,this.height);
          this.nodes = treemap((d3.hierarchy(this.data, (d)=>{ return d.values;})).sum((d)=>{return d.value}).sort(function(a, b) { return b.height - a.height || b.value - a.value; }))

       }
       treemap(data, width,height){
            return d3.treemap().size([width, height]).paddingInner((d)=>{
              if(d.depth ==0) return 10;
              if(d.depth ==1) return 2;
              if(d.depth ==2) return .25;
              return 0;
            })
       }

       drawleaves(){

         this.leaf = this.svg
            .selectAll('g')
            .data(this.nodes.leaves())
            .enter()
            .append('g')
            .attr('class',d=>{

               let classAttr = d.data.name;
                   classAttr = d.data.name.replaceAll(".","")
                   classAttr = d.data.name.replaceAll("'","");
                   return "group-rect-leaves single-neighborhood-"+classAttr;
            })
            .attr('transform', d=> `translate (${d.x0+this.margin.l},${d.y0+this.margin.l})`)
            .style('font-size','8px')

          this.leaf.append('title')
               .text(d => 'Demographic: '+d.data.demographic +', Borough: '+d.data.borough +' Neighborhood: '+d.data.name)

          this.leaf.append('rect')
              .attr('class', 'tree-rect-leaves')
              .attr('width', d => d.x1-d.x0 )
              .attr('height', d => d.y1-d.y0 )
              .attr('fill', d => this.colorScale(d.data.demographic))
              .attr("fill-opacity", 1)
       }

       makeScale(){
         d3.schemeCategory10
         this.colorScale = d3.scaleOrdinal()
                            .domain(['White','African_American','American_Indian','Asian','Native_Hawaiian','Other','Two_or_More_Races','Hispanic'])
                            .range(["#7bb9d8",
                                    "#eeee85",
                                    "#e783dd",
                                    "#d87e7c",
                                    "#97d683",
                                    "#ffc9b9",
                                    "#b0a5ee",
                                    "#827878"])
       }
       drawTitles(){
         const titles = [{title:'Brooklyn',x:this.margin.l,y:27, rotate:0},{title:'Manhattan',x:this.width-65 ,y:27,rotate:0},{title:'Staten Island',x:this.width-85,y:(this.height+this.margin.l+this.margin.r-15),rotate:0},
                         {title:'The Bronx',x:this.width+45,y:(this.height/2)+20, rotate:1},{title:'Queens',x:20,y:(this.height+this.margin.t), rotate:3}]

         const boroughs = d3.select('.static-main-svg')
                            .selectAll('.titles')
                            .data(titles)
                            .enter()
                            .append('g')
                            .attr('transform',d => `translate(${d.x},${d.y}),rotate(${d.rotate*90})`)
                            .style('font-size','20px')

                boroughs.append('text')
                        .text(d=>d.title)
                        .style('opacity','1');




       }
       drawLabels(){
         this.leaf.append('foreignObject').text((d,i)=>{if(i==0 ||i%8==0 && d.value>0 && !d.data.name.includes('park-cem') ){
                                        return d.data.name.replaceAll("-"," ")}})
                                 .attr('class','treemap-text-label')
                                 .attr('width',d=>{
                                   return window.innerWidth<625?0:30;
                                 })
                                 .attr('height', d=>{
                                   return window.innerWidth<625?0:125;
                                 })
                                 .style('width','30px')
                                 .style('overflow', 'show')
                                 .style('opacity',0.75)




       }
       getColorScale(){
         return this.colorScale
       }
      rerender(){
        this.contEl.innerHTML = "";
        this.draw();
      }
      drawOnOff(){

      }




  }


  //legend

   class Legend {
     constructor(scale , contEl){
       this.scale= scale;
       this.contEL = contEl;

      }
   draw(){

   }
   }


//barchart

class Bar {
  constructor(opts){
    this.contEl = opts.contEl;
    this.data = opts.data
    this.ratio_data = makeDataRatio(this.data);
    this.total = this.ratio_data[1];
    this.total = addCommas(this.total);

    this.data = sortData(this.data,'value');
    this.mainTitle = opts.title.main;
    this.subTitle =  opts.title.sub;
    this.colorScale = opts.colorScale;


    this.races = this.getRaces(this.data);


  }

  draw(){
    this.margin ={t:25,l:35,b:25,r:25};
    this.width = this.contEl.offsetWidth-(this.margin.r+this.margin.l);
    this.height = this.width;
    this.svg = d3.select(this.contEl)
                  .append('svg')
                  .attr('width', this.width+(this.margin.r+this.margin.l))
                  .attr('height', this.height+(this.margin.t+this.margin.b))
                  .append('g')
                  .attr('transform', 'translate(' + this.margin.l + ',' + this.margin.t + ')')

    this.makeScales();
    this.makeAxis();
    this.makeBars();
    this.drawTitle();

  }

  update(opts){

   this.data = opts.data;

   this.ratio_data = makeDataRatio(this.data);

   this.total = this.ratio_data[1];

   this.total = addCommas(this.total);
   this.mainTitle = opts.title.main;
   this.subTitle =  opts.title.sub;
   this.races = this.getRaces(this.data);
   this.makeScales();
   this.updateAxis();
   this.updateBars();
   this.drawTitle();


  }
  getRaces(){
    return this.data.map((val)=>{
                                     return val.key;
                                      })
  }
  makeScales(){

    this.xScale = d3.scaleBand()
                    .domain(this.races)
                    .rangeRound([0,this.width])
                    .paddingInner(.1)
                    .paddingOuter(.5);
   this.yScale = d3.scaleLinear()
                    .domain([0,(d3.max(this.data,function(d){return d.value;}))+0.05])
                    .range([this.height,0])
                    .nice();

  //color scale provided at initialation from the treemapap
  }
  makeAxis(){
     this.xAxis = d3.axisBottom(this.xScale)
                      .tickFormat(function(d) { return xLabels[d]; });

     this.svg.append('g')
            .attr('class', 'x-scale-class')
            .attr('transform', 'translate(' + 0 + ',' + this.height + ')')
            .call(this.xAxis);

    this.yAxis = d3.axisLeft(this.yScale);

    this.svg.append('g')
            .attr('class', 'y-scale-class')
            .attr('transform', 'translate(' + 10 + ',' + 0 + ')')
            .call(this.yAxis);



  }
  makeBars(){

    const rect = this.svg.append('g')
                          .selectAll('rect')
                          .data(this.data)
                          .enter()
                          .append('rect');
          rect
          .attr('class', 'bar-rect-bar')
          .attr('x', (d)=>{ return this.xScale(d.key)})
          .attr('width', this.xScale.bandwidth())
          .attr('y', (d) =>{return this.yScale(d.value)})
          .attr('height', (d)=>{return this.height-this.yScale(d.value)})
          .attr('fill', (d)=>{return this.colorScale(d.key)})
          .attr('stroke-width', 1)
          .attr('stroke', 'black')


  }

  updateAxis(){
    //make new d3 axis
    this.xAxis = d3.axisBottom(this.xScale)
                                .tickFormat(function(d) { return xLabels[d]; });;
    this.yAxis = d3.axisLeft(this.yScale);
     this.trans = d3.transition().duration(500);
     //call new d3 axis
    d3.select('.x-scale-class').transition(this.trans).call(this.xAxis);
    d3.select('.y-scale-class').transition(this.trans).call(this.yAxis);
  }
  updateBars(){
      const bars = d3.selectAll('.bar-rect-bar')
                    .data(this.data)
            bars.exit().transition(this.trans).remove();

            bars.enter().append('rect')

                .attr('class', 'bar-rect-bar')
                .merge(bars)
                .transition(this.trans)
                .attr('x', (d)=>{ return this.xScale(d.key)})
                .attr('width', this.xScale.bandwidth())
                .attr('y', (d) =>{return this.yScale(d.value)})
                .attr('height', (d)=>{return this.height-this.yScale(d.value)})
                .attr('fill', (d)=>{return this.colorScale(d.key)})
                .attr('stroke-width', 1)
                .attr('stroke', 'black');



  }

  drawTitle(){
           //data for title
           const mainTitle = this.mainTitle;
           const subTitle =  this.subTitle;
           const populationTotal = this.total;
           const data_title = [{title:mainTitle},{title:subTitle}, {title:populationTotal}];


          this.svg.selectAll('.title-bar-class').remove();
           //main title


          const titles = this.svg.selectAll('.title-bar-class')
                                  .data(data_title)
                                  .enter()
                                  .append('text')
                                  .attr('class', 'title-bar-class')
                                  .attr('id',(d,i)=>{
                                     return 'title-bar-class'+i;
                                  })
                                  .text((d,i) =>{
                                    if(i<1){

                                    return borough_title_dict[d.title.toUpperCase()]+',';
                                  }

                                    if(i<2){
                                    return d.title.toUpperCase();
                                  }
                                    return 'Population: '+d.title;
                                  })
                                  .attr('x', (d,i)=>{
                                     if(i<1){
                                     return (i*195)+25;
                                   }
                                   if(i<2){
                                   return window.innerWidth<560?25:25;
                                 }
                                   return this.width-100;

                                  })
                                  .attr('y', (d,i)=>{
                                        if(i<1){
                                        return 0;
                                      }
                                      if(i<2){
                                      return window.innerWidth<560?30:35;
                                    }
                                      return window.innerWidth<560?60:60;

                                  })
                                  .style('font-size',(d,i)=>{
                                    if(i<2){
                                    return window.innerWidth<560?'18px':'25px';
                                  }
                                    return '10px';

                                  })


          //subTitle


  }

  rerender(){
    this.contEl.innerHTML='';
    this.draw()
  }

}





//this function sorts data based on the attr given to the function
//state for the input will be held in the BarForm instance class

function sortData(data,attr){
  return data.sort((a,b)=>{
    return b[attr]-a[attr];
  })
}
// this function takes the data we have of nominal sum values and chages them to ratios of the whole
//it also returns the total population value to be used in the title
// this is an update becuase with most
function makeDataRatio(data){

   let total = 0;

   data.forEach(function(val){
        total += val.value;
       })

   data.forEach(function(val){
     val.value = (val.value/total);
   })


   return [data,total];
}

//add commas seperator
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


class BarForm {
  constructor(opts){
    this.borough_names=opts.bourough_names;
    this.contEl = opts.contEl;
    this.neighborhood_names = opts.neighborhood_names
    this.nieghborhood_borough_names= opts.nieghborhood_borough_names
    this._borough = 'ALL';
    this._neighborhood='ALL';


  }
   get borough(){
     return this._borough;
   }
   set borough(bor){
     this._borough=bor;
   }
   get neighborhood(){
     return this._neighborhood;
   }
   set neighborhood(neigh){
     this._neighborhood=neigh;
   }


  render(){


    this.makeBoroughInpput();
    this.makeNeighborhoodInputs();
    this.makeLabels();

  }
  makeBoroughInpput(){
    //set a variable borough to be used in the each function
    var borough = this.borough
    const borough_select = d3.select(this.contEl)
                              .append('div')
                              .attr('id', 'borough-div')
                              .append('select')
                              .attr('class', 'borough-select select-barform-inputs');

    const options =  borough_select
                        .selectAll('.borough-select')
                        .data(this.borough_names)
                        .enter()
                        .append('option')
                        .attr('id', (d) =>{return d+'-id'})
                        .attr('value', (d)=>{return d})
                        //function is used here to get a new this
                        .each(function(d){
                          if(d===borough){
                          d3.select(this).attr('selected','')
                          }
                        })

           options
                  .text((d)=>{return borough_dict[d].toUpperCase()});

  }
  makeNeighborhoodInputs(){
    var neighborhood = this.neighborhood
    const borough_select = d3.select(this.contEl)
                              .append('div')
                              .attr('id', 'neighborhood-div')
                              .append('select')
                              .attr('class', 'neighborhood-select select-barform-inputs')

    const options =  borough_select
                        .selectAll('.neighborhood-select')
                        .data(this.neighborhood_names)
                        .enter()
                        .append('option')
                        .attr('id', (d) =>{
                           let value = d.name;
                            value = value.replace("(","");
                            value = value.replace(")","");
                            value = value.replace("(","");
                            value = value.replace(")","");
                            value = value.replace(".","");
                            value = value.replace(".","");
                            value = value.replace("'","");
                            value = value.replace("'","");
                          return value+'-id'})
                        .attr('value', (d)=>{return d.name})
                        //function is used here to get a new this
                        .each(function(d){
                          if(d.name===neighborhood){
                          d3.select(this).attr('selected','')
                          }
                        })

           options
                  .text((d)=>{return d.name.toUpperCase()});

  }
  makeLabels(){
    d3.select('#borough-div').insert('label',":first-child").text('Borough:');
    d3.select('#neighborhood-div').insert('label',":first-child").text('Neighborhood:');
  }
  rerender(opts){
      this.borough = opts.borough;
      this.neighborhood=opts.neighborhood;
      this.contEl.innerHTML="";
      this.neighborhood_names = opts.neighborhood_names;
      this.render();
  }
}


//this function groups our data corecctly when the


function groupBorough(data,borough){

     const demographic_facts = crossfilter(data);
     const data_borough = demographic_facts.dimension(function(d){return d.borough})
     const data_filtered_borough = data_borough.filter(function(d){return d==borough})

     const filtered_borough = crossfilter(data_borough.top(Infinity))
     const demographic_filtered = filtered_borough.dimension(function(d){return d.demographic});
     const demographic_filtered_grouped = demographic_filtered.group().reduceSum(function(fact){return fact.value});
     const demo_filtered_data = demographic_filtered_grouped.top(Infinity);

     return demo_filtered_data;
}


function groupNeighborhood(data,neighborhood){

  const  demographic_facts = crossfilter(data);
  const niegh_dimenison    = demographic_facts.dimension(function(d){return d.name})
  const niegh_filter       = niegh_dimenison.filter(function(d){return d==neighborhood })

  const filtered_neighborhood = crossfilter(niegh_dimenison.top(Infinity));
  const  demo_filtered = filtered_neighborhood.dimension(function(d){return d.demographic})
  const demo_grouped_neighborhood = demo_filtered.group().reduceSum(function(fact){return fact.value});
  const demo_filtered_data = demo_grouped_neighborhood.top(Infinity);

  return demo_filtered_data;

}

function groupAll(tree_data){
  const  demo_data = crossfilter(tree_data);
  const demo_by_demo =demo_data.dimension(function(d){return d.demographic});
  const group_all_demo = demo_by_demo.group().reduceSum(function(fact){return fact.value});
  return   demo_all_data = group_all_demo.top(Infinity);
}



function mousevents(){

         tree_mouseover();
         tree_mouseout();


}


function tree_mouseover(){

    d3.selectAll('.group-rect-leaves').on('mouseover', d=>{


      let classAttr = d.data.name;
          classAttr = d.data.name.replaceAll(".","")
          classAttr = d.data.name.replaceAll("'","");

      d3.selectAll(".single-neighborhood-"+classAttr).selectAll('.treemap-text-label').style('font-size','12px').style('opacity',1);

    })
}

function tree_mouseout(){
      d3.selectAll('.group-rect-leaves').on('mouseout', d=>{
        let classAttr = d.data.name;
            classAttr = d.data.name.replaceAll(".","")
            classAttr = d.data.name.replaceAll("'","");


        d3.selectAll(".single-neighborhood-"+classAttr).selectAll('.treemap-text-label').style('font-size','8px').style('opacity',0.75);

      })
}

function clickChange(){
    this.labelOn = d3.select('#comments-on-off')


    this.labelOn.append('input')
                                .attr('type','checkbox')
                                .attr('class', 'neighborhood-label-checkbox')
                                .attr('checked', ' ');

    this.labelOn.append('div').attr('class', 'text-label-checkbox').text('Turn Neighborhood Labels Off')

d3.select('.neighborhood-label-checkbox').on('change',handleClickChange)
}

function handleClickChange(){
      console.log(d3.select(this).node().checked)
    if(d3.select(this).node().checked){
      d3.selectAll('.treemap-text-label').attr('class', function(){return 'treemap-text-label'})
    }else{
      d3.selectAll('.treemap-text-label').attr('class', 'treemap-text-label off')
    }
}
