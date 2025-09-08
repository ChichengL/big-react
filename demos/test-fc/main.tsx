import ReactDOM from 'react-dom/client';
import { useState, useEffect, Fragment } from 'react';
function App() {
	const [num, setNum] = useState(100);
	useEffect(() => {
		console.log('App mount');
	}, []);
	useEffect(() => {
		console.log('num update');
		return () => console.log('num destroy before update');
	}, [num]);
	// const arr =
	// 	num % 2 === 0
	// 		? [<li key="1">1</li>, <li key="2">2</li>]
	// 		: [<li key="2">2</li>, <li key="1">1</li>];
	return (
		<ul onClick={() => setNum(50)}>
			{new Array(num).fill(0).map((_, i) => {
				return <Child key={i}>{i}</Child>;
			})}
		</ul>
	);
}
function Child({ children }) {
	// useEffect(() => {
	// 	console.log('Child mount');
	// 	return () => {
	// 		console.log('Child unmount');
	// 	};
	// }, []);
	const now = performance.now();
	while (performance.now() - now < 1) {}
	return (
		<Fragment>
			<li>{children} </li>
		</Fragment>
	);
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
