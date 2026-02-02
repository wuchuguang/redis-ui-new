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
        thread::sleep(Duration::from_secs(3));
        
        println!("🚀 启动 Node.js 后端服务器...");
        
        // 获取应用资源目录
        let resource_dir = if cfg!(debug_assertions) {
            // 开发模式：使用当前目录下的build文件夹
            "./build".to_string()
        } else {
            // 生产模式：使用应用资源目录
            let exe_path = std::env::current_exe().unwrap();
            let exe_dir = exe_path.parent().unwrap();
            let app_dir = exe_dir.parent().unwrap().parent().unwrap().parent().unwrap();
            format!("{}/Contents/Resources", app_dir.display())
        };
        
        println!("📁 服务器目录: {}", resource_dir);
        
        // 检查文件是否存在
        let index_js_path = format!("{}/index.js", resource_dir);
        let package_json_path = format!("{}/package.json", resource_dir);
        
        if !std::path::Path::new(&index_js_path).exists() {
            println!("❌ index.js 文件不存在: {}", index_js_path);
            return;
        }
        
        if !std::path::Path::new(&package_json_path).exists() {
            println!("❌ package.json 文件不存在: {}", package_json_path);
            return;
        }
        
        println!("✅ 服务器文件检查通过");
        
        // 启动 Node.js 服务器 - 使用打包好的index.js
        let output = Command::new("node")
            .arg("index.js")
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
    println!("🎉 Redis管理工具启动中...");
    
    // 启动 Node.js 服务器
    start_node_server();
    
    tauri::Builder::default()
        .setup(|_app| {
            // 应用启动时的设置
            println!("🎉 Redis管理工具启动成功");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 