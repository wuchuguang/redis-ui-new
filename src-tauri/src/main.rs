// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::thread;
use std::time::Duration;
use tauri::Manager;

// 启动 Node.js 服务器
fn start_node_server() {
    thread::spawn(|| {
        // 等待一下让前端先启动
        thread::sleep(Duration::from_secs(2));
        
        println!("🚀 启动 Node.js 后端服务器...");
        
        // 在开发模式下，服务器应该已经由 npm run dev 启动
        if cfg!(debug_assertions) {
            println!("🔧 开发模式：服务器应该已经启动");
            return;
        }
        
        // 生产模式：尝试启动服务器
        println!("📦 生产模式：尝试启动服务器");
        
        // 获取应用资源目录
        let resource_dir = if cfg!(debug_assertions) {
            ".".to_string()
        } else {
            // 生产模式：使用应用资源目录
            let exe_path = std::env::current_exe().unwrap();
            let exe_dir = exe_path.parent().unwrap();
            let app_dir = exe_dir.parent().unwrap().parent().unwrap().parent().unwrap();
            format!("{}/Resources", app_dir.display())
        };
        
        println!("📁 服务器目录: {}", resource_dir);
        
        // 启动 Node.js 服务器
        let output = Command::new("node")
            .arg("server/index.js")
            .current_dir(&resource_dir)
            .output();
            
        match output {
            Ok(output) => {
                if output.status.success() {
                    println!("✅ Node.js 服务器启动成功");
                } else {
                    println!("❌ Node.js 服务器启动失败: {}", 
                        String::from_utf8_lossy(&output.stderr));
                }
            }
            Err(e) => {
                println!("❌ 无法启动 Node.js 服务器: {}", e);
            }
        }
    });
}

fn main() {
    // 启动 Node.js 服务器
    start_node_server();
    
    tauri::Builder::default()
        .setup(|app| {
            // 应用启动时的设置
            println!("🎉 Redis管理工具启动成功");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 