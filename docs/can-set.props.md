@property {{}} can-set.props props
@parent can-set.properties

@description Contains a collection of prop generating functions.

The following functions create `compares` objects that can be mixed together to create a set `Algebra`.

```js
import set from "can-set";
const algebra = new set.Algebra(
	{

		// ignore this property in set algebra
		sessionId: function() {
			return true;
		}
	},
	set.props.boolean( "completed" ),
	set.props.rangeInclusive( "start", "end" )
);
```
