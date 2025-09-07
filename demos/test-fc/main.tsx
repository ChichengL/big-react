import ReactDOM from 'react-dom/client';
import { useState, useEffect } from 'react';
function App() {
	const [num, setNum] = useState(0);
	useEffect(() => {
		console.log('App mount');
	}, []);
	// const arr =
	// 	num % 2 === 0
	// 		? [<li key="1">1</li>, <li key="2">2</li>]
	// 		: [<li key="2">2</li>, <li key="1">1</li>];
	return (
		<div
			onClick={() => {
				setNum((prev) => prev + 1);
			}}
		>
			<div>current Number :{num}</div>
			{num % 2 === 0 ? <Child /> : null}
		</div>
	);
}
function Child() {
	useEffect(() => {
		console.log('Child mount');
		return () => {
			console.log('Child unmount');
		};
	}, []);
	return <p>child</p>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
