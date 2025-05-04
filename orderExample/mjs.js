var numClick =0;

function myFunction() {
    numClick ++;

   // document.getElementById("demo").innerHTML = "Paragraph changed." + numClick;

  // document.writeln("Paragraph changed." + numClick);

    //window.alert("Paragraph changed." + numClick);
    var str_str = "Paragraph "
             + "changed." 
    console.log(str + numClick);

 }

 let frySize    = -1;
 let burgerSize = -1;
 let nuggetSize = -1;
 let saladSize  = -1; 


 function validateForm() {
  //alert("submitted");
  let fry = document.forms["myForm"]["option1"];
 // alert(fry);

  let burger = document.forms["myForm"]["option2"];

  let nugget = document.forms["myForm"]["option3"];

  let salad  = document.forms["myForm"]["option4"];

 // alert ("What checked are "+fry.checked + burger.checked + nugget.checked +salad.checked);
  
  frySize = document.forms["myForm"]["optradio"].value;
  console.log("Size of fry is " + frySize);  
  
  burgerSize = document.forms["myForm"]["burgerSize"].value;
  //let burgerSize = document.getElementById("sell");

  console.log("Burger size is " + burgerSize);

  if (nugget.checked) 
    nuggetSize = 1;

  if (salad.checked)
    saladSize  = 1;

  
  updateImage();

  return false;

}



function updateImage(){
    let size = [1,2,3];
    size.forEach(function(value){
         let element = document.getElementById("fry_"+value);
         element.style.visibility = "hidden";

         element = document.getElementById("burger_"+value);
         element.style.visibility = "hidden";


    });
    let element = document.getElementById("fry_"+ frySize);
    element.style.visibility = "visible";

    element = document.getElementById("burger_"+burgerSize);
    element.style.visibility = "visible";


    if(nuggetSize >0) {     
      element = document.getElementById("nugget_"+nuggetSize);
      element.style.visibility = "visible";
    } else {
      element = document.getElementById("nugget_1");
      element.style.visibility = "hidden";
    }
    
    
    if(saladSize >0) {     
      element = document.getElementById("salad_"+saladSize);
      element.style.visibility = "visible";
    } else {
      element = document.getElementById("salad_1");
      element.style.visibility = "hidden";
    }



}