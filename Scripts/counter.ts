// Thanks to @Wodysus for the art and original object
// Thanks to @0x40 for the original script
// Script refactor, typing, and optimization by @sparr0

import * as TTP from "@tabletop-playground/api";
import { DLListNode, ScriptedCounterObject } from ".";

// TTP.world.startDebugMode();

// Appease the Typescript gods who would never allow us to re-type refObject
const refScriptedCounter = TTP.refObject as ScriptedCounterObject;

// previous state is necessary to detect failed increment/decrement
refScriptedCounter._previous_state = null;

// referernces to the leftmost and rightmost counters in this group
refScriptedCounter._groupends = [refScriptedCounter, refScriptedCounter];

// optional references to left and right neighbors
refScriptedCounter._neighbors = [null, null];

// set the digits of this and all attached counters to a specific number
refScriptedCounter.setNumber = function (number: number) {
	// start at the right end of the group
	let curr: ScriptedCounterObject | null = this._groupends[1];
	// set each counter to the appropriate digit
	do {
		let digit = number % 10;
		number = Math.floor(number / 10);
		curr.setState(digit);
	} while ((curr = curr._neighbors[0]) && curr != this._groupends[1]);
};

// get the number represented by this and all attached counters
refScriptedCounter.getNumber = function () {
	// start at the left end of the group
	let curr: ScriptedCounterObject | null = this._groupends[0];
	let number = 0;
	// accumulate digits from all counters
	do {
		number = number * 10 + curr.getState();
	} while ((curr = curr._neighbors[1]) && curr != this._groupends[0]);
	return number;
};

// keep track of the previous state when an increment or decrement is attempted
function onStateChanged(
	object: ScriptedCounterObject,
	new_state: number,
	old_state: number
) {
	object._previous_state = old_state;
}
refScriptedCounter.onStateChanged.add(onStateChanged);

// increment this counter, equivalent to PrimaryAction
refScriptedCounter.increment = function () {
	// console.log(this.getId() + " i " + this.getState());
	this._previous_state = this.getState();
	this.setState(this._previous_state + 1);
	// console.log(this.getId() + " i " + this.getState());
	return this.onIncrement();
};

// decrement this counter, equivalent to SecondaryAction
refScriptedCounter.decrement = function () {
	// console.log(this.getId() + " d " + this.getState());
	this._previous_state = this.getState();
	this.setState(this._previous_state - 1);
	// console.log(this.getId() + " d " + this.getState());
	return this.onDecrement();
};

// After an attempted increment, roll over if carry is possible and successful
// Return success of increment attempt
refScriptedCounter.onIncrement = function () {
	// console.log( this.getId() + " oI " + this._previous_state + " " + this.getState() );
	let digit = this.getState();
	if (digit === 9 && this._previous_state === 9) {
		// console.log(this.getId() + " oI 99");
		if (this._neighbors[0]?.increment()) {
			// console.log(this.getId() + " oI 90 True");
			this.setState(0);
			return true;
		}
		// console.log(this.getId() + " oI 99 False");
		return false;
	}
	// console.log(this.getId() + " oI True");
	return true;
};

// After an attempted decrement, roll over if borrow is possible and successful
// Return success of decrement attempt
refScriptedCounter.onDecrement = function () {
	// console.log( this.getId() + " oD " + this._previous_state + " " + this.getState() );
	let digit = this.getState();
	if (digit === 0 && this._previous_state === 0) {
		// console.log(this.getId() + " oD 00");
		if (this._neighbors[0]?.decrement()) {
			// console.log(this.getId() + " oD 09 True");
			this.setState(9);
			return true;
		}
		// console.log(this.getId() + " oD 00 False");
		return false;
	}
	// console.log(this.getId() + " oD True");
	return true;
};

// Wrapper functions for other methods needed to avoid loss of `this` context with
// object passed from event callback.
function onNumberAction(
	object: ScriptedCounterObject,
	player: TTP.Player,
	number: number
) {
	object.setNumber(number);
}
function onPrimaryAction(object: ScriptedCounterObject) {
	object.onIncrement();
}
function onSecondaryAction(object: ScriptedCounterObject) {
	object.onDecrement();
}

// enable user interaction with the counter value
refScriptedCounter.makeDynamic = function () {
	this.onNumberAction.add(onNumberAction);
	this.onPrimaryAction.add(onPrimaryAction);
	this.onSecondaryAction.add(onSecondaryAction);
};

// disable user interaction with the counter value
// FIXME: need to revert engine-applied state changes actions
refScriptedCounter.makeStatic = function () {
	this.onNumberAction.remove(onNumberAction);
	this.onPrimaryAction.remove(onPrimaryAction);
	this.onSecondaryAction.remove(onSecondaryAction);
};

// This function is currently broken due to upstream local/world vector bug
refScriptedCounter._edgeLine = function (edge: number, color: TTP.Color) {
	// console.log('eL')
	let start = this.getExtent();
	start.z = 0;
	start = start.rotateAngleAxis((edge - 1) * 180, new TTP.Vector(1, 0, 0));
	// console.log(start)
	let end = start.rotateAngleAxis(180, new TTP.Vector(0, 1, 0));
	// console.log(end)
	start = this.localPositionToWorld(start);
	end = this.localPositionToWorld(end);
	// console.log(start);
	// console.log(end);
	// console.log(color);
	TTP.world.drawDebugLine(start, end, color, 1, 0.5);
};

// Draw a debug point on the left or right edge of the counter
refScriptedCounter._edgePoint = function (index: number, color: TTP.Color) {
	// console.log("eP");
	TTP.world.drawDebugPoint(
		this.getPosition().add(
			this.getSnapPoint(index).getLocalPosition().divide(2)
		),
		4,
		color,
		1
	);
};

// Disconnect this counter from its neighbors, and them from it
refScriptedCounter.forgetNeighbors = function () {
	// console.log(this.getId() + " -N");
	for (let index = 0; index <= 1; index++) {
		const neighbor = this._neighbors[index];
		if (neighbor) {
			// console.log(this.getId() + " -N " + index);
			neighbor._neighbors[1 - index] = null;
			neighbor._groupends[1 - index] = neighbor;
			neighbor._propagateGroupend(1 - index);
			this._neighbors[index] = null;
			this._edgePoint(index, new TTP.Color(1, 0, 0, 0.5));
		}
		this._groupends[0] = this._groupends[1] = this;
	}
};

// propagate the left groupend to right neighbors, or vice versa
refScriptedCounter._propagateGroupend = function (index: number) {
	// console.log(this.getId() + " pG " + index);
	let curr: ScriptedCounterObject | null = this;
	while ((curr = curr._neighbors[1 - index]) && curr != this) {
		// console.log(curr.getId() + " pG+");
		curr._groupends[index] = this._groupends[index];
	}
};

function onGrab(object: ScriptedCounterObject, player: TTP.Player) {
	// console.log(object.getId() + " oG");
	object.forgetNeighbors();
}
refScriptedCounter.onGrab.add(onGrab);

function onHit(
	object: ScriptedCounterObject,
	otherObject: TTP.GameObject,
	first: boolean,
	impactPoint: TTP.Vector,
	impulse: TTP.Vector
) {
	// non ground objects that are hit will move
	if (object.getObjectType() != 1) object.forgetNeighbors();
}
refScriptedCounter.onHit.add(onHit);

function onDestroyed(object: ScriptedCounterObject) {
	object.forgetNeighbors();
}
refScriptedCounter.onDestroyed.add(onDestroyed);

refScriptedCounter.findNeighbors = function () {
	// console.log(this.getId() + " +N");
	for (let index = 0; index <= 1; index++) {
		const snapPosition = this.getSnapPoint(index).getGlobalPosition();
		const candidate = TTP.world.sphereOverlap(
			snapPosition,
			0
		)[0] as ScriptedCounterObject;
		if (
			!candidate || // didn't find a neighbor
			candidate.getTemplateId() != this.getTemplateId() || // not a counter
			!candidate._neighbors || // not initialized yet
			!candidate.getPosition().equals(snapPosition, 0.01) // not snapped
		) {
			// console.log(this.getId() + " +N " + index + " nope");
			this._neighbors[index] = null;
			this._groupends[index] = this;
			this._edgePoint(index, new TTP.Color(1,0,0,0.5));
		} else {
			// console.log(this.getId() + " +N " + index + " " + candidate.getId());
			this._neighbors[index] = candidate;
			this._groupends[index] = candidate._groupends[index];
			this._propagateGroupend(index);
			candidate._neighbors[1 - index] = this;
			candidate._groupends[1 - index] = this._groupends[1 - index];
			candidate._propagateGroupend(1 - index);
			this._edgePoint(index, new TTP.Color(0,1,0,0.5));
		}
	}
};

function onSnapped(
	object: ScriptedCounterObject,
	player: TTP.Player,
	snapPoint: TTP.SnapPoint
) {
	// console.log(object.getId() + " oS");
	object.findNeighbors();
	//TODO: Set type to prevent movement when there is a way to still allow
	//interactions with primary / secondary / number actions
	// object.setObjectType(1);
}
refScriptedCounter.onSnapped.add(onSnapped);

switch(refScriptedCounter.getExecutionReason()) {
	case "Create":
		refScriptedCounter.makeDynamic();
		break;
	case "ScriptReload":
		refScriptedCounter.findNeighbors();
		break;
	case "StateLoad":
		refScriptedCounter.makeDynamic();
		refScriptedCounter.findNeighbors();
		break;
	default:
}
