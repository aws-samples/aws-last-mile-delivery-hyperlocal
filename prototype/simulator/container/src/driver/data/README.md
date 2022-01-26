# How to grab paths for testing

1. Navigate [here](https://graphhopper.com/maps/?point=-6.198411%2C106.825905&point=-6.190561%2C106.737156&locale=en-US&vehicle=car&weighting=fastest&elevation=true&turn_costs=true&details=edge_id&instructions=false&debug=true&use_miles=false&layer=Omniscale&points_encoded=false)
   1. IMPORTANT: `points_encoded=false` parameter must be in the URL

1. Open Inspector / Network

1. Pick request that called `/route?...`

1. Copy the `paths[0].points.coordinates` field

