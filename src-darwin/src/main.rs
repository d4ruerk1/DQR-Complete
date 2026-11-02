use std::env;
use winit::event::{Event, WindowEvent};
use winit::event_loop::EventLoop;
use winit::window::WindowAttributes;

struct RunnerOptions {
    window_title: String,
}

impl Default for RunnerOptions {
    fn default() -> Self {
        Self {
            window_title: "DRQ Complete Runner".to_string(),
        }
    }
}

fn extract_options() -> RunnerOptions {
    let mut opts = RunnerOptions::default();
    let mut args = env::args().skip(1);

    while let Some(arg) = args.next() {
        if arg == "--title" {
            if let Some(val) = args.next() {
                opts.window_title = val;
            }
        }
    }

    opts
}

fn main() {
    let opts = extract_options();
    let loop_ctx = EventLoop::new().expect("Failed creating window event loop");

    let _win = loop_ctx
        .create_window(
            WindowAttributes::default()
                .with_title(opts.window_title)
                .with_visible(true)
                .with_resizable(true),
        )
        .expect("Failed creating runner window");

    loop_ctx
        .run(move |event, active_loop| {
            if let Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } = event
            {
                active_loop.exit();
            }
        })
        .expect("Event loop execution failed");
}
