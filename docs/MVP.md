# Frankly — MVP document

**Source of truth for what to build.** Written by the team, received Sat Oct 17, 1:00 PM. It replaces `docs/IDEA.md` wherever they disagree. The text below is the team's original, unedited. Open questions and proposed decisions are in `docs/DECISIONS.md`. **The team asked that any suggestion be run past them before it's built.**

---

THE TASK: Build Frankly, an AI-powered recipe-planning and grocery optimization app. Users provide their kitchen preferences, recipes, household size, budget, and existing pantry inventory. Frankly creates a practical meal plan and consolidated grocery list, estimates checkout costs using sample store prices, suggests lower-cost alternatives, and remembers cooking history. One of the most important and useful features is that it compiles all the information that you give it PLUS the information that it receives whenever you finish a recipe or give feedback on it, and remembers it to give you better recipes in the future.

During onboarding: choose what kitchen appliances you have, how many times you want to cook, what cuisines you like, scales for spiciness preference,

**Remember I want you to first create a notesheet that records everything/changes you've made in this repo. So that an AI agent could follow your steps clearly.**

APP FLOW: **Keep in mind IF ANYTHING YOU WANT SUGGEST RUN IT THROUGH US FIRST**

* Onboarding
   * Name
   * Let's gather some questions about your life
      * Do you usually cook for yourself or someone else?
         * If someone else, trigger extra question: how many people do you typically cook for?

Preferences (1-10 sliders) You can always change these later

* Spiciness Level
* Seasoning Level
* Difficulty/Complexity of Recipes

* Cuisine? CHECK ALL THE BOXES
* Dietary restrictions/preferences? (check all the boxes, include vegan )
* Allergens? (check all the boxes, but have an "Other" where you can type it)

* What Appliances do you have? (check all the boxes you have)
* Where do you usually grocery shop?: (check all the boxes, "Other", "I don't know") **If user selects costco or grocery stores that requires a membership, keep that in mind and suggest those stores when recommending. If not dont suggest those places.

It'll say "Building your Frankly…"

HOME PAGE (When users normally open app)

* Bottom of page there's a Navigation bar with the different tab's buttons
   * Navigation Bar Buttons
      * Button 1:Active Recipe: this is the recipe that was just made
      * Button 2: Book Icon: Cookbook- you can view your saved and past recipes

* Button 3 at the center: main Home page, brings you back to the  "What would you like to make today?" Screen with text bar
* Button 4: "Don't know what to make today?" Helps you decide what to make, gives you cuisine options
* Button 5: Profile:
   * Change Preferences Here
   * Settings

HOME PAGE:

* At the center, it just opens with text that says "What would you like to cook today?" With a line below. And you can click the line to start typing the name of the dish that you want. When you press submit,

	Then it prompts these questions:

* How many servings?
* What's your target budget for this meal?
* Preview: your recipe will be built with theses preferences (shows the ones from Onboarding), Looks right? Users Click "Yes" or "Change Preferences" which brings you into settings

* Cooking it up…
   * Gives recipe:

Shows recipe
	Name of Dish
	Servings xx
	Will last in the fridge for xx weeks
	Approx. Price $xx
	Shows INGREDIENTS LIST & recipe
Ingredients list has "location button" nearby so that they can check where to find each item

Buttons at the bottom:
	"Let's go"
	"Save for later"
	"I'm not feeling this"

ALSO IMPORTANT: If the budget or other parameter is unrealistic, then it'll show a popup instructing them to try again and change it

ACTIVE RECIPE TAB: When you say "Let's go," it moves it to the Current Recipe tab. If a new recipe is created and "Let's Go", it replaces the current recipe. Only one recipe can live in Curent Recipe at the time. It's there to make it easy for users to jump to that while they're working on it or grabbing ingredeints. There' s abutton at the bottom that says "I've finished" which triggers the I've finished action or "I'm making something elese" that closes it and puts it into Saved.

I'VE FINISHED SEQUENCE
	When a user finishes their recipe, they're asked 'Rate how you enjoyed it on a scale of 1 - 10', rate how you enjoyed cooking it, were the prices accurate on scale of 1-10? Were there more or less leftovers than you were expecting? And then it STORES ALL OF THAT into data before filing the recipe into Cooked Recipes on the cookbook.

COOKBOOK TAB:

* When you Save a recipe for Later, its filed into the Cookbook Tab. Users can open their Cookbook at any time. There's an option to Tweak recipe., and an option to "Let's Go", which moves it to Current Recipe , and an option to Delete. There's also "Cooked Recipes"

AESTHETICS + ORGANIZATION: When you first open the CookBook tab, there's two "books" Saved Recipes and Cooked Recipes. You can click through each one easily.

I DONT KNOW TAB": This button/tab is used by the user when they dont know what to make.

* Drop down bar on cuisines the user is looking for to make. Default to cuisine the user originally selected when first open this tab each log in to the app/platform.
* Recipe provided will behave like actual cook book: first just shows a collection of different dishes, brief description. Showing actual steps only when user clicks into that dish. * works this way for every different cuisines clicked into.

BACKEND:

* In my head I'm envisioning that the engine calculating these and grabbing these recipes runs thru Claude API, but it's got to get this food/recipe information/knowhow from somewhere. How would you suggest I achieve this? A food/recipe API?
* All the data I think should be stored in Supabase.
   * Here's all the free APIs we have access to by the way. You can check if any of them are useful

* [Google Maps SDKs/APIs](https://developers.google.com/maps)
* [NOAA Climate Data](https://www.ncdc.noaa.gov/cdo-web/)
* [Weather API](https://open-meteo.com/en/docs)
* [Uber API](https://developer.uber.com/docs)
* [NASA Climate Change](https://climate.nasa.gov/)
* [Public Transport API](https://developer.here.com/documentation/public-transit/dev_guide/index.html)
* [PX4 Developer Guide](https://px4.io/)
* [Mapbox Travel Time Map API](https://docs.mapbox.com/api/navigation/isochrone/)
* [OpenStreetMap API](https://wiki.openstreetmap.org/wiki/API)
* [Google Earth Engine](https://developers.google.com/earth-engine)
* [Animal Video Dataset](https://sites.google.com/view/elizabethbondi/dataset)
* [US EPA Dataset Gateway](https://edg.epa.gov/metadata/catalog/main/home.page)
* [Deepart.io](https://creativitywith.ai/deepartio/)
* [Unity](https://learn.unity.com/)
* [Blender](https://www.blender.org/)
* [Unreal Engine](https://www.unrealengine.com/en-US)
* [Spotify API](https://developer.spotify.com/documentation/web-api)
* [Stable Diffusion API](https://stablediffusionapi.com/)
* [Photoshop](https://developer.adobe.com/photoshop/photoshop-api-docs/#tag/Lightroom/operation/acrstatus)
* [Figma](https://www.figma.com/developers/api)
* [Imgur api](https://apidocs.imgur.com/)
* [Youtube api](https://developers.google.com/youtube/v3)
* [Godot Engine](https://godotengine.org/)
* [Three.js](https://threejs.org/)
* [Google Classroom API](https://developers.google.com/classroom/reference/rest)
* [Gradescope API](https://github.com/apozharski/gradescope-api)
* [Gradescope Python Utility Library](https://pypi.org/project/gradescope/)
* [Canvas API](https://canvas.instructure.com/doc/api/)
* [Google Docs API](https://developers.google.com/docs/api/how-tos/overview)
* [Wikipedia API](https://www.mediawiki.org/wiki/API:Main_page)
* [Wolfram Alpha API](https://products.wolframalpha.com/api)
* [Zoom API](https://developers.zoom.us/docs/api/)
* [NumWorks: Open Source Calculator](https://www.numworks.com/)
* [WHO Data Api](https://www.who.int/data/gho/info/gho-odata-api)
* [Apple Watch Developer Guide](https://developer.apple.com/documentation/watchkit/)
* [Fitbit Developer Guide](https://dev.fitbit.com/build/guides/)
* [Apple Healthcare Data Reader](https://developer.apple.com/documentation/healthkit/samples/accessing_health_records)
* [OpenFDA API](https://open.fda.gov/apis/)
* [Kaggle Covid19 Data](https://www.kaggle.com/datasets/imdevskp/corona-virus-report)
* [MyHealthFinder API](https://health.gov/our-work/national-health-initiatives/health-literacy/consumer-health-content/free-web-content/apis-developers/api-documentation)
* [Lead Pollution Data](https://ourworldindata.org/lead-pollution)
* [Google Cloud Healthcare API](https://cloud.google.com/healthcare)
* [HealthData](https://healthdata.gov/)
* [CDC Datasets](https://data.cdc.gov/)
* [National Library of Medicine Datasets](https://www.ncbi.nlm.nih.gov/datasets/)
* [NIH datasets](https://dash.nichd.nih.gov/explore/dataset)
* [Free Healthcare Datasets](https://www.iguazio.com/blog/top-22-free-healthcare-datasets-for-machine-learning/)
* [Google Cloud Vision](https://cloud.google.com/vertex-ai/docs/training-overview#image)

Tell Claude to create note.txt RECORDING EVERY CHANGES MADE OR use the handoff file to do the same thing. Purpose is to TO COMMIT AND PUSH CHANGES WITH NOTES TELLING THE OTHER CLAUDE WHAT IS HAPPENING.

How App Works:
-> input recipe name, number of servings needed, budget, how much leftover ingredients you want to have, location,
AI agent will provide information such as where to best get the ingredients with the best cost, closest distance to the user, choose the right amount of ingredients to get, including seasoning stuff which usually last a long time, and the agent will keep track so it doesn't tell the user to get it for every dish repetitively. After each dish, agent will keep track and remember the dates this dish is cooked so in the future when family ran out of ideas on what to make, agent could suggest dish because they havent cooked it in a while. Also

-> PriceChef

What Must Work:

* Kitchen onboarding: select appliances, preferred cuisines, spice tolerance, dietary restrictions, and household sizes
* Main Portal: Recipe Agent: enter recipe names or choose from sample recipes, servings, budget, number of meals, and leftover tolerance.
* Persistent pantry: record ingredients already owned, quantities where known, and pantry staples.
* Budget-aware planning: calculate ingredient quantities, estimated package costs, and total checkout cost using a local sample price dataset.
* Smart grocery list: combine ingredients across recipes, subtract usable pantry inventory, and avoid duplicate purchases.
* Store comparison: compare sample prices across two or three fictional or clearly labeled demo stores, with a transparent cheapest-option recommendation.
* Cooked history: mark a meal as cooked and save its date so it can be recommended again later.

What Makes Frankly Different:

* Database Management & leftover optimization: Frankly remembers everything and records it: prefer recipes that reuse ingredients already purchased, and after every recipe made, it asks if you liked it, had leftovers, or used up all your ingredients, and the information trains itself to make it smarter for you in the future.
* Smart substitutions: offer cheaper alternatives and explain the estimated savings.
* Staple memory: remember long-lasting items such as oil, salt, and seasonings to avoid buying them repeatedly.
* Meal rotation: recommend meals the household hasn't cooked recently, while respecting its preferences.

Features

* Did you enjoy your meal?/Was it enough/Did you have leftovers pop-up at the end
* Along with the Recipe Agent that gives you the recipe when you search for it, there's a "What should I make?" Agent that you can use whenever you're not sure what to make. It uses past preferences, past meals, and existing ingredients that it remembers

We can't do this stuff yet:

* Live grocery store pricing, inventory, and retailer API integrations.
* Receipt scanning, barcode scanning, and automatic pantry detection.
* Multi-user household synchronization, complex accounts, and notifications.
* A fully autonomous agent that purchases groceries.

Notes:

* For the hackathon, onboarding should take less than a minute. let people skip optional questions

How to make the project score well at DubHacks (from CHATGPT)

Your strongest story is AI agent + operations optimization + persistent state.

Functionality — 30%
Demonstrate a complete request-to-shopping-list workflow. Show the calculations, update the pantry, cook a meal, refresh the app, and show that history persists.

Design — 20%
Use a cohesive kitchen-inspired visual system, readable price breakdowns, strong hierarchy, clear loading states, and an obvious next action. Avoid a generic chat interface as the entire product.

Creativity — 20%
Combine pantry memory, cross-recipe ingredient reuse, full-package pricing, and meal rotation. The distinction is optimizing the whole cooking workflow, not generating a single cheap recipe.

Track applicability — 30%
Explicitly demonstrate the agent automating a multi-step task, handling constraints, updating shared state, and explaining its decisions. That's the strongest connection to Cook Smarter.
